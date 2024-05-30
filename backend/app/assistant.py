import asyncio
from deepgram import (
    DeepgramClient, DeepgramClientOptions, LiveTranscriptionEvents, LiveOptions
)
from groq import AsyncGroq
from app.config import settings

SYSTEM_PROMPT = """You are a helpful and enthusiastic conversational assistant.
Your answers should be very short and concise as you will be having a voice conversation with the user.
"""

deepgram_config = DeepgramClientOptions(options={'keepalive': 'true'})
deepgram = DeepgramClient(settings.DEEPGRAM_API_KEY, config=deepgram_config)
dg_connection_options = LiveOptions(
    model='nova-2',
    language='en',
    # Apply smart formatting to the output
    smart_format=True,
    # To get UtteranceEnd, the following must be set:
    interim_results=True,
    utterance_end_ms='1500',
    vad_events=True,
    # Time in milliseconds of silence to wait for before finalizing speech
    endpointing=500,
)
groq = AsyncGroq(api_key=settings.GROQ_API_KEY)


class Assistant:
    def __init__(self, websocket, chat_messages=None, memory_size=6):
        self.websocket = websocket
        self.dg_connection = deepgram.listen.asynclive.v('1')
        self.transcript_parts = []
        self.transcript_queue = asyncio.Queue()
        self.system_message = {'role': 'system', 'content': SYSTEM_PROMPT}
        self.chat_messages = [] if chat_messages is None else chat_messages
        self.memory_size = memory_size
    
    async def start_transcription(self):
        async def on_message(self_handler, result, **kwargs):
            sentence = result.channel.alternatives[0].transcript
            if len(sentence) == 0:
                return
            if result.is_final:
                self.transcript_parts.append(sentence)
                await self.transcript_queue.put({'type': 'transcript_final', 'text': sentence})
                if result.speech_final:
                    full_transcript = ' '.join(self.transcript_parts)
                    self.transcript_parts = []
                    await self.transcript_queue.put({'type': 'speech_final', 'text': full_transcript})
            else:
                await self.transcript_queue.put({'type': 'transcript_interim', 'text': sentence})
        
        self.dg_connection.on(LiveTranscriptionEvents.Transcript, on_message)
        if await self.dg_connection.start(dg_connection_options) is False:
            raise Exception('Failed to connect to Deepgram')
    
    async def process_transcripts(self):
        while True:
            transcript = await self.transcript_queue.get()
            if transcript['type'] == 'speech_final':
                print('FINAL!!')
            else:
                await self.websocket.send_json(transcript)
    
    async def run(self):
        # Start the transcription process
        await self.start_transcription()
        
        # Create a task to process transcripts concurrently
        processor_task = asyncio.create_task(self.process_transcripts())

        # Receive audio stream from the client and send it to Deepgram to transcribe it
        while True:
            data = await self.websocket.receive_bytes()
            await self.dg_connection.send(data)
        