# MMM-WhisperGPT

This is a module for the [MagicMirror²](https://github.com/MichMich/MagicMirror/).

<a href="http://www.youtube.com/watch?feature=player_embedded&v=l_r8pJOCJcw
" target="_blank"><img src="http://img.youtube.com/vi/l_r8pJOCJcw/0.jpg" 
alt="IMAGE ALT TEXT HERE" width="320" height="240" border="0" /></a>


**How it works** 👉 https://nikro.me/articles/professional/crafting-our-ai-assistant/

Goal of the module is to create a custom interactive widget that uses Open AI tools:

- Whisper - self-hosted model for voice-to-text transcription.
- LangChain - intended to be used with ChatGPT API, to process the requests.
- [Picovoice -> Porcupine](https://picovoice.ai/docs/quick-start/porcupine-nodejs/) - is used for offline (self-hosted) word trigger (accent on the privacy).
- also... mimic3 :)

Idea is the following:

1. Wake word (Porcupine).
2. ...record query (show a sexy animation, will be done later)
3. ...pass to self-hosted Whisper
4. ...transcribe voice-to-text
5. Show the question as transcribed rendered-text (in the module render)
5. ...pass through LangChain to ChatGPT
6. ...pass the textual reply back to the module and render on-screen 
7. ...use TTS (mimic3) - self-hosted on the network, to throw back a wav file to play.

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
                whisperUrl: '192.168.1.5:9000/asr',
                whisperMethod: 'openai-whisper',
                mimic3Url: '192.168.1.6:59125'
            }
        }
    ]
}
```

## Configuration options

| Option                            | Required?   | Description    
|---------------------------------- |-------------|-----------
| `picovoiceKey`                    | **Required** | Picovoice access key - you have to register to obtain it - this is used for trigger word.
| `picovoiceWord`                   | *Optional* | Picovoice trigger word, i.e. BUMBLEBEE, JARVIS, etc. Defaults to JARVIS.
| `picovoiceSilenceTime`            | *Optional* | Silence period - defaults to 3 (3 seconds).
| `picovoiceSilenceThreshold`       | *Optional* | This is usually background noise * THIS NUMBER. Default value is 1.1 (aka 10%).
| `audioDeviceIndex`                | *Optional* | Audio device - i.e. 3 - those will be printed out when you're using debug mode. Defaults to 0.
| `whisperUrl`                      | **Required** | URL (or IP?) to self-hosted instance of the Whisper.
| `whisperMethod`                   | *Optional* | Whisper method: openai-whisper or faster-whisper. Defaults to: faster-whisper.
| `whisperLanguage`                 | *Optional* | Defaults to: en.
| `openAiKey`                       | **Required** | API Key of OpenAI.
| `openAiSystemMsg`                 | *Optional* | System msg - how the AI should behave.
| `mimic3Url`                       | **Required** | Mimic3 URL (server), with protocol, port, without /api/tts
| `mimic3Voice`                     | *Optional* | Mimic3 Voice - default: en_US/cmu-arctic_low%23gka
| `debug`                           | *Optional* | If you want to debug, default is: false.


## What is Picovoice / Porcupine
[Picovoice](https://picovoice.ai/) / [Porcupine](https://picovoice.ai/products/porcupine/) is used for the "Trigger" word. It's a self-hosted small AI / Neural Network (NN). Picovoice offers a range of services, including a license for this offline AI. It only sends usage statistics, not the actual audio conversations.

## What is Whisper
[Whisper](https://github.com/openai/whisper) is an open-source product from OpenAI. It's a Large Language Model (LLM) AI that handles speech-to-text (transcription). In my personal case, I have it self-hosted on my local network. 

I used this: https://github.com/ahmetoner/whisper-asr-webservice

## What is ChatGPT
[ChatGPT](https://openai.com/product/chatgpt) is another product from OpenAI. It's a Large Language Model (LLM) AI. You will need to register and get an API Key to use it.

## What is LangChain
[LangChain](https://js.langchain.com/) is a library built around LLMs that allows for extra functionality, such as long-term memory.

## What is Mimic3 (Mycroft)
[Mycroft's Mimic3](https://mycroft-ai.gitbook.io/docs/mycroft-technologies/mimic-tts/mimic-3) is a Text-to-Speech (TTS) system based on a Large Language Model (LLM). It offers realistic TTS that can run on somewhat resource-restricted systems. I initially tried to set it up on my OrangePi, but instead, I installed it on the same machine with Whisper and use it via the network.

I used this docker-compose.yml 😉

```yaml
version: '3.7'

services:
  mimic3:
    image: mycroftai/mimic3
    ports:
      - 59125:59125
    volumes:
      - .:/home/mimic3/.local/share/mycroft/mimic3
    stdin_open: true
    tty: true
```

## Troubleshooting
1. If your audio doesn't work - check if you're using [alsa](https://www.alsa-project.org/main/index.php/Main_Page) or [pulseaudio](https://www.freedesktop.org/wiki/Software/PulseAudio/). You might need to install `mpg123`. You can install it using the command `sudo apt-get install mpg123`.
2. You might also need to install `lame` for audio encoding. You can install it using the command `sudo apt-get install lame`.
