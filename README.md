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
                openAiKey: 'xxx',
                openAiSystemMsg: 'xxx',
                whisperUrl: '192.168.1.5'
            }
        }
    ]
}
```

## Configuration options

| Option           | Description
|----------------- |-----------
| `picovoiceKey`                    | *Required* Picovoice access key - you have to register to obtain it - this is used for trigger word.
| `picovoiceWord`                   | *Optional* Picovoice trigger word, i.e. BUMBLEBEE, JARVIS, etc. Defaults to JARVIS.
| `picovoiceSilenceTime`            | *Optional* Silence period - defaults to 3 (3 seconds).
| `picovoiceSilenceThreshold`       | *Optional* Silence threshold, my calculations are 500 is roughly enough. Defaults to 600.
| `audioDeviceIndex`                | *Optional* Audio device - i.e. 3 - those will be printed out when you're using debug mode. Defaults to 0.
| `whisperUrl`                      | *Required* URL (or IP?) to self-hosted instance of the Whisper.
| `openAiKey`                       | *Required* API Key of OpenAI.
| `openAiSystemMsg`                 | *Required* System msg - how the AI should behave.
| `mimic3Url`                       | *Required* Mimic3 URL (server), with protocol, port, without /api/tts
| `mimic3Voice`                     | *Optional* Mimic3 Voice - default: en_US/cmu-arctic_low%23gka
| `debug`                           | *Optional* If you want to debug, default is: false.


## What is PicVoice / Porcupine
It's used for "Trigger" word. It's a self-hosted small AI / Neural Network (NN).

PicoVoice offers a range of services, they do offer a license for this offline AI, it just sends usage statistics (not the actual audio conversations).

## What is Whisper
It's OpenAI's product (LLM AI), open-sourced. It handles speech-to-text (transcription). In my personal case, I have it on my local network, self-hosted.

## What is ChatGPT
It's OpenAI's product - LLM AI. You will need to register and get API Key.

## What is LangChain
It's a library around LLMs that allows for extra functionality, i.e. long-term memory.

## What is Mimic3 (Mycroft)
[Mycroft's Mimic3](https://mycroft-ai.gitbook.io/docs/mycroft-technologies/mimic-tts/mimic-3) -  is a TTS (text-to-speech) based on an LLM (another NN). It offers realistic TTS that runs on somewhat restricted ressource-systems.

It was VERY hard for me to set it up, you'll need:

- ONNXRUNTIME - and it has to be compiled - here's how I did it (there's also a python WHEEL) - https://github.com/Nikro/onnxruntime-arm32v7-docker
- CMAKE - newer version of CMAKE also needs to be compiled for ONNXRUNTIME. I did a compilation for arm32v7 - https://gist.github.com/Nikro/b38e915d3fb356972808f6f74e1576fb#comments
- After having ONNXRUNTIME running on OrangePI, I had to build mimic3 - and it relied on some other stuff:

  - Install python3.9 (or higher) and make it default
  - Install cython: `pip install cython`
  - I had to manually install this: https://github.com/roy-ht/editdistance/ - clone and (after activating venv like mimic3 install says) - run: `python3 setup.py` and later `python3 setup.py install`.
  - Then continue with mimic3


## Troubleshooting

1. If your audio doesn't work - check if you're using alsa or pulseaudio. I had to install `mpg123`.
2. You might also need to install `lame`.