const NodeHelper = require('node_helper');
const Log = require("logger");
const Player = require('play-sound')();
const path = require('path');

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
      const defaultConfig = {
        audioDeviceIndex: 0,
        picovoiceWord: 'JARVIS',
        picovoiceSilenceTime: 3,
        picovoiceSilenceThreshold: 600,
      };

      // Merge default configuration with changed values.
      this.config = Object.assign({}, defaultConfig, payload);

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

    // Set the flag.
    this.isRecording = true;
  },

  stopRecording: function() {
    if (this.isRecording) {
      this.playSound(this.soundFolder + '/notification_stop.mp3');
      this.sendSocketNotification('STOP_RECORDING');

      // Reset the flag.
      this.isRecording = false;
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
