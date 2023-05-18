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
      picovoiceKey: '',
      picovoiceWord: 'JARVIS',
      picovoiceSilenceTime: 3,
      picovoiceSilenceThreshold: 700,
      audioDeviceIndex: 0,
      whisperUrl: '',
      whisperLanguage: 'en',
      whisperMethod: 'faster-whisper',
      mimic3Url: '',
      mimic3Voice: 'en_US/cmu-arctic_low#gka',
      openAiKey: '',
      openAiSystemMsg: "The following is a friendly conversation between a human and an AI. The AI is talkative and provides lots of specific details from its context. If the AI does not know the answer to a question, it truthfully says it does not know.",
      debug: false
    };

    // Merge default configuration with changed values.
    this.config = Object.assign({}, defaultConfig, this.config);

    // Check if required things are set.
    if (!this.config.picovoiceKey || !this.config.whisperUrl || !this.config.mimic3Url || !this.config.openAiKey) {
      this.state = 'config_issue';
    }
    else {
      this.sendSocketNotification('CONFIG', this.config);
    }
	},

  getDom: function() {
    var wrapper = document.createElement("div");

    // State-based UI rendering
    switch(this.state) {
      case 'config_issue':
        wrapper.innerHTML = "Please supply configs...";
        break;
      case 'idle':
        wrapper.innerHTML = "Waiting for trigger word...";
        break;
      case 'listening':
        wrapper.innerHTML = this.triggeredKeyword + ": Listening...";
        break;
      case 'processing':
        wrapper.innerHTML = this.triggeredKeyword + ": Processing...";
        break;
      case 'request_received':
        wrapper.innerHTML = '<div>' + this.triggeredKeyword + ": Processing..." + '</div>';
        wrapper.innerHTML += '<div><span class="bright">Request: </span>' + this.requestText + '</div>';
        break;
      case 'reply_received':
        wrapper.innerHTML = '<div><span class="bright">Reply: </span>' + this.replyText + '</div>';

        // Reset state in 10 seconds.
        setTimeout(this.resetState.bind(this), 30 * 1000);
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
      this.state = 'processing';
    }
    else if (notification === 'UPLOAD_WHISPER') {
      Log.info('Uploading to Whisper');
      this.state = 'processing';
    }
    else if (notification === 'REQUEST_PROCESSED') {
      Log.info('Text: ' + payload);
      this.state = 'request_received';
      this.requestText = payload;
    }
    else if (notification === 'REPLY_RECEIVED') {
      Log.info('Reply: ' + payload);
      this.state = 'reply_received';
      this.replyText = payload;

      const notification = {
        message: '<span class="bright">Reply:</span> ' + payload,
        title: `${this.config.picovoiceWord } Replied...`,
        imageFA: 'robot',
        timer: 15 * 1000
      };
      this.sendNotification("SHOW_ALERT", notification);
    }
    this.updateDom();
	},

  resetState: function() {
	  this.state = 'idle';
	  this.requestText = '';
	  this.replyText = '';
    this.updateDom();
  }
});
