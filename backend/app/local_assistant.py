import re
import string
import asyncio
import requests
import wave
import pyaudio
from groq import AsyncGroq
from deepgram import (
    DeepgramClient, DeepgramClientOptions, LiveTranscriptionEvents, LiveOptions, Microphone
)
from rich.console import Console
from app.config import settings

SYSTEM_PROMPT = """You are a helpful and enthusiastic conversational assistant.
Your answers should be very short and concise as you will be having a voice conversation with the user.
"""

DEEPGRAM_TTS_URL = 'https://api.deepgram.com/v1/speak?model=aura-luna-en&encoding=linear16&sample_rate=24000'

console = Console()
groq = AsyncGroq(api_key=settings.GROQ_API_KEY)
deepgram_config: DeepgramClientOptions = DeepgramClientOptions(
    options={'keepalive': 'true'}
)
deepgram: DeepgramClient = DeepgramClient(settings.DEEPGRAM_API_KEY, config=deepgram_config)


async def assistant_chat(messages, model='llama3-8b-8192'):
    res = await groq.chat.completions.create(messages=messages, model=model)
    return res.choices[0].message.content

async def transcribe_audio():
    # Event to signal transcription is complete
    transcription_complete = asyncio.Event()
    
    try:
        dg_connection = deepgram.listen.asynclive.v('1')
        transcript_parts = []
        full_transcript = ''

        async def on_message(self, result, **kwargs):
            nonlocal transcript_parts, full_transcript
            sentence = result.channel.alternatives[0].transcript
            if len(sentence) == 0:
                return
            if result.is_final:
                # We need to collect these and concatenate them together when we get a speech_final=true
                transcript_parts.append(sentence)
                console.print(sentence, style='cyan')
                
                # Sufficent silence detected to consider this end of speech
                if result.speech_final:
                    transcription_complete.set()
                    full_transcript = ' '.join(transcript_parts)
            else:
                # Interim results
                console.print(sentence, style='cyan', end='\r')
        
        async def on_error(self, error, **kwargs):
            console.print(f'Error: {error}', style='red')
        
        dg_connection.on(LiveTranscriptionEvents.Transcript, on_message)
        dg_connection.on(LiveTranscriptionEvents.Error, on_error)

        # connect to websocket
        options: LiveOptions = LiveOptions(
            model='nova-2',
            language='en',
            # Apply smart formatting to the output
            smart_format=True,
            # Raw audio format details
            encoding='linear16',
            channels=1,
            sample_rate=16000,
            # To get UtteranceEnd, the following must be set:
            interim_results=True,
            utterance_end_ms='1000',
            vad_events=True,
            # Time in milliseconds of silence to wait for before finalizing speech
            endpointing=300,
        )
        addons = {
            # Prevent waiting for additional numbers
            'no_delay': 'true'
        }

        if await dg_connection.start(options, addons=addons) is False:
            console.print('Failed to connect to Deepgram')
            return
        
        # Open a microphone stream on the default input device
        microphone = Microphone(dg_connection.send)
        microphone.start()
        console.print('\nListening...\n')

        # Wait for the transcription to complete
        await transcription_complete.wait()
        
        microphone.finish()
        await dg_connection.finish()
        return full_transcript
    
    except Exception as e:
        console.print(f'Could not open socket: {e}')
        return

def should_end_conversation(text):
    text = text.translate(str.maketrans('', '', string.punctuation))
    text = text.strip().lower()
    return re.search(r'\b(goodbye|bye)\b$', text) is not None

def text_to_speech(text):
    headers = {
        'Authorization': f'Token {settings.DEEPGRAM_API_KEY}',
        'Content-Type': 'application/json'
    }
    res = requests.post(DEEPGRAM_TTS_URL, headers=headers, json={'text': text}, stream=True)
    with wave.open(res.raw, 'rb') as wf:
        p = pyaudio.PyAudio()
        stream = p.open(
            format=p.get_format_from_width(wf.getsampwidth()),
            channels=wf.getnchannels(),
            rate=wf.getframerate(),
            frames_per_buffer=1024,
            output=True
        )
        while len(data := wf.readframes(1024)): 
            stream.write(data)
        
        stream.close()
        p.terminate()

async def run():
    system_message = {'role': 'system', 'content': SYSTEM_PROMPT}
    memory_size = 8
    messages = []
    while True:
        user_message = await transcribe_audio()
        messages.append({'role': 'user', 'content': user_message})

        if should_end_conversation(user_message):
            break

        assistant_message = await assistant_chat([system_message] + messages[-memory_size:])
        messages.append({'role': 'assistant', 'content': assistant_message})
        console.print(assistant_message, style='dark_orange')
        text_to_speech(assistant_message)

def main():
    asyncio.run(run())
