from deepgram import (
    DeepgramClient, DeepgramClientOptions, LiveTranscriptionEvents, LiveOptions
)
from app.config import settings

deepgram_config = DeepgramClientOptions(options={'keepalive': 'true'})
deepgram = DeepgramClient(settings.DEEPGRAM_API_KEY, config=deepgram_config)
dg_connection_options = LiveOptions(
    model='nova-2',
    language='en',
    # Apply smart formatting to the output
    smart_format=True,
    # To get UtteranceEnd, the following must be set:
    interim_results=True,
    utterance_end_ms='1000',
    vad_events=True,
    # Time in milliseconds of silence to wait for before finalizing speech
    endpointing=300,
)

async def transcribe_audio(websocket):
    dg_connection = deepgram.listen.asynclive.v('1')
    
    async def on_message(self, result, **kwargs):
        sentence = result.channel.alternatives[0].transcript
        if result.is_final:
            await websocket.send_json({'text': sentence})
    
    dg_connection.on(LiveTranscriptionEvents.Transcript, on_message)
    if await dg_connection.start(dg_connection_options) is False:
        raise Exception('Failed to connect to Deepgram')
    return dg_connection