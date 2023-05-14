const NodeHelper = require('node_helper');
const Log = require("logger");

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
      this.setupAudioRecorder();
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
      const keywordIndex = porcupine.process(pcm);
      if (keywordIndex >= 0) {
        Log.info('Keyword detected: ' + this.config.picovoiceWord);
        this.sendSocketNotification('KEYWORD_DETECTED', keywordIndex);
      }
    }

    // Stop the recorder when the process is interrupted
    process.on("SIGINT", function () {
      isInterrupted = true;
      recorder.release();
      process.exit();
    });
  },
});
