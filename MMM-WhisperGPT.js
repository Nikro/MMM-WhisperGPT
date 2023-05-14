/* global Module */

/* Magic Mirror
 * Module: MMM-WhisperGPT
 *
 * By Sergiu Nagailic
 * MIT Licensed.
 */
Module.register("MMM-WhisperGPT", {
	defaults: {
    state: 'idle'
	},

	requiresVersion: "2.1.0", // Required version of MagicMirror

	start: function() {
    Log.info("Starting module: " + this.name);
    this.state = 'idle';

    const defaultConfig = {
      audioDeviceIndex: 0,
      picovoiceWord: 'JARVIS',
      picovoiceSilenceTime: 3,
      picovoiceSilenceThreshold: 600,
    };

    // Merge default configuration with changed values.
    this.config = Object.assign({}, defaultConfig, this.config);

    this.sendSocketNotification('CONFIG', this.config);
	},

  getDom: function() {
    var wrapper = document.createElement("div");

    // State-based UI rendering
    switch(this.state) {
      case 'idle':
        wrapper.innerHTML = "Waiting for trigger word...";
        break;
      case 'listening':
        wrapper.innerHTML = this.triggeredKeyword + ": Listening...";
        break;
      case 'processing':
        wrapper.innerHTML = this.triggeredKeyword + ": Processing...";
        break;
      case 'speaking':
        wrapper.innerHTML = this.config.text;
        break;
      default:
        wrapper.innerHTML = "Unknown state";
        break;
    }

    return wrapper;
  },

  getHeader: function() {
    return 'WhisperGPT';
  },


  getScripts: function() {
		return [];
	},

	getStyles: function () {
		return [
			"MMM-WhisperGPT.css",
		];
	},

	// Load translations files
	getTranslations: function() {
		//FIXME: This can be load a one file javascript definition
		return {
			en: "translations/en.json",
			es: "translations/es.json"
		};
	},

	processData: function(data) {
		var self = this;
		this.dataRequest = data;
		if (this.loaded === false) { self.updateDom(self.config.animationSpeed) ; }
		this.loaded = true;
	},

	// socketNotificationReceived from helper
	socketNotificationReceived: function (notification, payload) {
    if (notification === 'KEYWORD_DETECTED') {
      Log.info('Keyword detected: ', payload);
			this.triggeredKeyword = payload;
		}
		else if (notification === 'START_RECORDING') {
      Log.info('Recording: start');
      this.state = 'listening';
    }
    else if (notification === 'STOP_RECORDING') {
      Log.info('Recording: stop');
      this.state = 'idle';
    }
    else if (notification === 'UPLOAD_WHISPER') {
      Log.info('Uploading to Whisper');
      this.state = 'processing';
      this.uploadToWhisper();
    }
    this.updateDom();
	},
});
