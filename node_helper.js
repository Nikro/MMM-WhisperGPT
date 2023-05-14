/* Magic Mirror
 * Node Helper: MMM-WhisperGPT
 *
 * By Sergiu Nagailic
 * MIT Licensed.
 */
const NodeHelper = require('node_helper');
const mic = require('mic');
const {
  Porcupine,
  BuiltinKeyword,
} = require("@picovoice/porcupine-node");

const Log = require("logger");

module.exports = NodeHelper.create({
  start: function() {
    console.log("Starting node_helper for: " + this.name);
  },

  socketNotificationReceived: function(notification, payload) {
    if (notification === 'CONFIG') {
      this.config = payload;
      this.setupMic();
    }
  },

  setupMic: function() {
    const micInstance = mic({
      rate: '16000',
      channels: '1',
      debug: true,
      fileType: 'wav'
    });

    const micInputStream = micInstance.getAudioStream();
    const porcupine = new Porcupine(
      this.config.picovoiceKey,
      [BuiltinKeyword[this.config.picovoiceWord]],
      [0.65]
    );

    micInputStream.on('data', (audioFrame) => {
      const keywordIndex = porcupine.process(audioFrame);
      if (keywordIndex >= 0) {
        this.sendSocketNotification('KEYWORD_DETECTED', keywordIndex);
      }
    });

    micInstance.start();
  },
});
