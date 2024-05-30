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
    utterance_end_ms='1500',
    vad_events=True,
    # Time in milliseconds of silence to wait for before finalizing speech
    endpointing=500,
)

async def start_transcription(transcript_queue):
    dg_connection = deepgram.listen.asynclive.v('1')
    transcript_parts = []
    
    async def on_message(self, result, **kwargs):
        nonlocal transcript_parts
        sentence = result.channel.alternatives[0].transcript
        if len(sentence) == 0:
            return
        if result.is_final:
            transcript_parts.append(sentence)
            await transcript_queue.put({'type': 'transcript_final', 'text': sentence})
            if result.speech_final:
                full_transcript = ' '.join(transcript_parts)
                transcript_parts = []
                await transcript_queue.put({'type': 'speech_final', 'text': full_transcript})
        else:
            await transcript_queue.put({'type': 'transcript_interim', 'text': sentence})
    
    dg_connection.on(LiveTranscriptionEvents.Transcript, on_message)
    if await dg_connection.start(dg_connection_options) is False:
        raise Exception('Failed to connect to Deepgram')
    return dg_connection