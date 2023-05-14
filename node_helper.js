/* Magic Mirror
 * Node Helper: MMM-WhisperGPT
 *
 * By Sergiu Nagailic
 * MIT Licensed.
 */
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

  setupAudioRecorder: function() {
    const porcupine = new Porcupine(
      this.config.picovoiceKey,
      [BuiltinKeyword[this.config.picovoiceWord]],
      [0.65]
    );

    const frameLength = porcupine.frameLength;
    const recorder = new PvRecorder(this.config.audioDeviceIndex, frameLength);

    recorder.start();

    if (this.config.debug) {
      console.log(PvRecorder.getAudioDevices());
      console.log(`Using device: ${recorder.getSelectedDevice()}...`);
      console.log(`Listening for wake word: ${this.config.picovoiceWord}`);
    }

    recorder.onAudioFrame((pcm) => {
      const keywordIndex = porcupine.process(pcm);
      if (keywordIndex >= 0) {
        Log.info('Keyword detected: ' + this.config.picovoiceWord);
        this.sendSocketNotification('KEYWORD_DETECTED', keywordIndex);
      }
    });

    // Stop the recorder when the process is interrupted
    process.on("SIGINT", function () {
      recorder.release();
      process.exit();
    });
  },
});
