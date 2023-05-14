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
                audioDeviceMic: 'hw:0,0',
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
| `picovoiceWord`        | *Required* Picovoice trigger word, i.e. BUMBLEBEE, JARVIS, etc.
| `audioDeviceMic`        | *Required* Audio device - i.e. hw:0,0 - see [mic](https://www.npmjs.com/package/mic).
| `whisperUrl`        | *Required* URL (or IP?) to self-hosted instance of the Whisper.
| `next`        | *Optional* DESCRIPTION HERE TOO <br><br>**Type:** `int`(milliseconds) <br>Default 60000 milliseconds (1 minute)
