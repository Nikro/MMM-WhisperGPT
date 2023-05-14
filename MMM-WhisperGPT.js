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
    this.sendSocketNotification('CONFIG', this.config);
	},

  getDom: function() {
    var wrapper = document.createElement("div");

    // State-based UI rendering
    switch(this.state) {
      case 'idle':
        wrapper.innerHTML = "Waiting for trigger word...";
        // TODO: Display service status indicator
        break;
      case 'listening':
        wrapper.innerHTML = this.triggeredKeyword + ": Listening...";
        // TODO: Display audio visualization widget
        break;
      case 'processing':
        wrapper.innerHTML = "Processing...";
        // TODO: Display processing indicator
        break;
      case 'speaking':
        wrapper.innerHTML = this.config.text;
        // TODO: Display textual reply and start text-to-speech
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
      // Here you can trigger any actions you want to perform when a keyword is detected.
      // This could be sending a notification to another module, updating the UI, etc.
			// set dataNotification
			this.triggeredKeyword = payload;
			this.state = 'listening';
			this.updateDom();
		}
	},
});
