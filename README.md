# MMM-WhisperGPT

This is a module for the [MagicMirror²](https://github.com/MichMich/MagicMirror/).

Goal of the module is to create a custom interactive widget that uses Open AI tools:

- Whisper - self-hosted model for voice-to-text transcription.
- LangChain - intended to be used with ChatGPT API, to process the requests.
- [Picovoice -> Porcupine](https://picovoice.ai/docs/quick-start/porcupine-nodejs/) - is used for offline (self-hosted) word trigger (accent on the privacy).

Idea is the following:

1. Wake word (Porcupine).
2. ...record query (show a sexy animation)
3. ...pass to self-hosted Whisper (details later)
4. ...transcribe voice-to-text
5. Show the question as transcribed rendered-text.
5. ...pass through LangChain to ChatGPT
6. ...pass the textual reply back to the module and render on-screen (also use text-to-voice, details later)

## Using the module

To use this module, add the following configuration block to the modules array in the `config/config.js` file:
```js
var config = {
    modules: [
        {
            module: 'MMM-WhisperGPT',
            config: {
                // See below for configurable options
                picovoiceKey: 'xxx',
                picovoiceWord: 'JARVIS',
                picovoiceSilenceTime: 3,
                picovoiceSilenceThreshold: 600,
                audioDeviceIndex: 3,
                whisperUrl: '192.168.1.5'
            }
        }
    ]
}
```

## Configuration options

| Option           | Description
|----------------- |-----------
| `picovoiceKey`        | *Required* Picovoice access key - you have to register to obtain it - this is used for trigger word.
| `picovoiceWord`        | *Optional* Picovoice trigger word, i.e. BUMBLEBEE, JARVIS, etc. Defaults to JARVIS.
| `picovoiceSilenceTime`        | *Optional* Silence period - defaults to 3 (3 seconds).
| `picovoiceSilenceThreshold`        | *Optional* Silence threshold, my calculations are 500 is roughly enough. Defaults to 600.
| `audioDeviceIndex`        | *Optional* Audio device - i.e. 3 - those will be printed out when you're using debug mode. Defaults to 0.
| `whisperUrl`        | *Required* URL (or IP?) to self-hosted instance of the Whisper.
| `debug`        | *Optional* If you want to debug, default is: false.


## Troubleshooting

1. If your audio doesn't work - check if you're using alsa or pulseaudio. I had to install mpg123.