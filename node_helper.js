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
      device: this.config.audioDeviceMic,
      fileType: 'wav'
    });

    const porcupine = new Porcupine(
      this.config.picovoiceKey,
      [BuiltinKeyword[this.config.picovoiceWord]],
      [0.65]
    );

    let buffer = [];
    micInstance.getAudioStream().on('data', (data) => {
      // Append new data to the buffer
      buffer = buffer.concat(Array.from(data));

      // If buffer is long enough, process it and remove used data
      while (buffer.length >= porcupine.frameLength) {
        const frame = buffer.slice(0, porcupine.frameLength);
        buffer = buffer.slice(porcupine.frameLength);

        const keywordIndex = porcupine.process(frame);
        if (keywordIndex >= 0) {
          this.sendSocketNotification('KEYWORD_DETECTED', keywordIndex);
        }
      }
    });



    micInstance.start();
  },
});
