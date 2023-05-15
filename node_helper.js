const NodeHelper = require('node_helper');
const Log = require("logger");
const Player = require('play-sound')();
const path = require('path');
const fs = require('fs');
const Lame = require("node-lame").Lame;
const { Buffer } = require('buffer');
const axios = require('axios');
const FormData = require('form-data');
const wave = require('wavefile');

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
    this.audio = [];

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
        this.audio.push(...pcm);
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

    // If we're recording, let's stop and clean-up and restart.
    if (this.isRecording) {
      this.audio = [];
      this.cleanupFiles();
    }


    // Set the flag.
    this.isRecording = true;
  },

  stopRecording: async function() {
    if (this.isRecording) {
      this.playSound(this.soundFolder + '/notification_stop.mp3');
      this.sendSocketNotification('STOP_RECORDING');

      const path = '/tmp/request.wav';
      const wav = new wave.WaveFile();

      wav.fromScratch(1, 16000, '16', this.audio);
      fs.writeFileSync(path, wav.toBuffer());

      // Close the output stream
      console.log('Recording complete!');

      // This generates /tmp/request.mp3.
      await this.convertWavToMp3();

      // Upload directly.
      await this.uploadToWhisper();

      // Reset the flag.
      this.isRecording = false;
    }
  },

  convertWavToMp3: function() {
    return new Promise((resolve, reject) => {
      const encoder = new Lame({
        output: "/tmp/request.mp3",
        bitrate: 192,
      }).setFile("/tmp/request.wav");

      encoder
        .encode()
        .then(() => {
          console.log('MP3 conversion complete!');
          resolve(); // Resolve the promise when encoding is finished
        })
        .catch((error) => {
          console.log('Something went wrong with MP3 encoding: ' + error);
          reject(error); // Reject the promise if encoding fails
        });
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

      if (this.config.debug) {
        console.log('URL:', this.config.whisperUrl);
        console.log('Params:', {
          method: 'openai-whisper',
          task: 'transcribe',
          language: 'en',
          encode: true,
          output: 'json',
        });
        console.log('Headers:', formData.getHeaders());
        console.log('Form:', formData);
      }
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
          headers: formData.getHeaders(),
        }
      );


      this.sendSocketNotification('REQUEST_PROCESSED', response.data.text);

      // Clean-up
      this.cleanupFiles();

    } catch (error) {
      console.error('Error uploading file:', error);
    }
  },

  cleanupFiles: function() {
    this.audio = [];
    fs.unlink('/tmp/request.wav', (err) => {
      if (err) {
        console.error('Error deleting file (/tmp/request.wav):', err);
      } else {
        console.log('File deleted successfully: /tmp/request.wav');
      }
    });
    fs.unlink('/tmp/request.mp3', (err) => {
      if (err) {
        console.error('Error deleting file (/tmp/request.mp3):', err);
      } else {
        console.log('File deleted successfully: /tmp/request.mp3');
      }
    });
  },

  playSound: function playSound(soundFilePath) {
    Player.play(soundFilePath, (err) => {
      if (err) {
        console.error(`Failed to play sound ${soundFilePath}: ${err}`);
      }
    });
  }
});
