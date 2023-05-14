const NodeHelper = require('node_helper');
const Log = require("logger");
const Player = require('play-sound')();
const path = require('path');
const fs = require('fs');
const lame = require('node-lame');
const { Buffer } = require('buffer');
const axios = require('axios');

const {
  Porcupine,
  BuiltinKeyword,
} = require("@picovoice/porcupine-node");
const { PvRecorder } = require("@picovoice/pvrecorder-node");

module.exports = NodeHelper.create({
  start: function() {
    console.log("Starting node_helper for: " + this.name);
  },

  socketNotificationReceived: function(notification, payload) {
    if (notification === 'CONFIG') {
      this.config = payload;

      // Audio recorder.
      this.setupAudioRecorder();

      // Set up some paths.
      const modulePath = path.resolve(__dirname);
      this.soundFolder = path.join(modulePath, 'sounds');
    }
    else if (notification === 'UPLOAD_WHISPER') {
      this.uploadToWhisper();
    }
  },

  setupAudioRecorder: async function() {
    const porcupine = new Porcupine(
      this.config.picovoiceKey,
      [BuiltinKeyword[this.config.picovoiceWord]],
      [0.65]
    );
    if (this.config.debug) {
      console.log(PvRecorder.getAudioDevices());
    }

    const frameLength = porcupine.frameLength;
    const silenceThreshold = this.config.picovoiceSilenceThreshold;
    const silenceDuration = this.config.picovoiceSilenceTime * 16000 / frameLength;
    let silenceFrames = 0;
    let isSilenceDetected = false;

    // Experimental values for PvRecorder constructor
    const audioDeviceIndex = this.config.audioDeviceIndex;
    const bufferSizeMSec = 500; // Experiment with different buffer sizes in milliseconds
    const logOverflow = false;
    const logSilence = false;

    const recorder = new PvRecorder(
      audioDeviceIndex,
      frameLength,
      bufferSizeMSec,
      logOverflow,
      logSilence
    );


    recorder.start();

    if (this.config.debug) {
      console.log(`Using device: ${recorder.getSelectedDevice()}...`);
      console.log(`Listening for wake word: ${this.config.picovoiceWord}`);
    }


    let isInterrupted = false;

    while (!isInterrupted) {
      const pcm = await recorder.read();

      if (this.isRecording) {
        this.outputStream.write(Buffer.from(pcm));

      }

      // Let's try and detect X seconds of silence.
      const rms = Math.sqrt(pcm.reduce((sum, sample) => sum + sample ** 2, 0) / pcm.length);
      if (rms < silenceThreshold) {
        silenceFrames++;
      } else {
        silenceFrames = 0;
      }

      if (silenceFrames >= silenceDuration) {
        if (!isSilenceDetected && this.isRecording) {
          console.log("Silence detected...");
          this.stopRecording();
          isSilenceDetected = true;
        }
        // Perform any action when silence is detected for the specified duration
        // For example, stop recording, trigger an event, etc.
      } else {
        isSilenceDetected = false;
      }

      // Now try detect trigger-word.
      const keywordIndex = porcupine.process(pcm);
      if (keywordIndex >= 0) {
        Log.info('Keyword detected: ' + this.config.picovoiceWord);
        this.startRecording();
        this.sendSocketNotification('KEYWORD_DETECTED', this.config.picovoiceWord);
      }
    }

    // Stop the recorder when the process is interrupted
    process.on("SIGINT", function () {
      isInterrupted = true;
      recorder.release();
      process.exit();
    });
  },

  startRecording: function() {
    this.playSound(this.soundFolder + '/notification_start.mp3');
    this.sendSocketNotification('START_RECORDING');

    this.outputStream = fs.createWriteStream('/tmp/request.wav');


    // Set the flag.
    this.isRecording = true;
  },

  stopRecording: function() {
    if (this.isRecording) {
      this.playSound(this.soundFolder + '/notification_stop.mp3');
      this.sendSocketNotification('STOP_RECORDING');

      // Close the output stream
      this.outputStream.end(() => {
        console.log('Recording complete!');
        // This generates /tmp/request.mp3.
        this.convertWavToMp3();

        this.sendSocketNotification('UPLOAD_WHISPER');
      });

      // Reset the flag.
      this.isRecording = false;
    }
  },

  convertWavToMp3: function() {
    const encoder = new lame.Encoder({
      output: '/tmp/request.mp3',
      bitrate: 192,
      sampleRate: 44100,
      channels: 2
    });

    const inputStream = fs.createReadStream('/tmp/request.wav');
    const outputStream = fs.createWriteStream('/tmp/request.mp3');

    inputStream.pipe(encoder).pipe(outputStream);

    outputStream.on('finish', () => {
      console.log('MP3 conversion complete!');
    });
  },

  uploadToWhisper: async function() {
    try {
      const file = '/tmp/request.mp3';

      const formData = new FormData();
      formData.append('audio_file', fs.createReadStream(file), {
        filename: 'request.mp3',
        contentType: 'audio/mpeg',
      });

      const response = await axios.post(
        this.config.whisperUrl,
        formData,
        {
          params: {
            method: 'openai-whisper',
            task: 'transcribe',
            language: 'en',
            encode: true,
            output: 'json',
          },
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      console.log(response.data.text);
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  },

  playSound: function playSound(soundFilePath) {
    Player.play(soundFilePath, (err) => {
      if (err) {
        console.error(`Failed to play sound ${soundFilePath}: ${err}`);
      }
    });
  }
});
