import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.transcription import start_transcription

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOW_ORIGINS,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

async def process_transcripts(websocket, transcript_queue):
    while True:
        transcript = await transcript_queue.get()
        if transcript['type'] == 'speech_final':
            print('FINAL!!')
        else:
            await websocket.send_json(transcript)

@app.websocket('/listen')
async def websocket_listen(websocket: WebSocket):
    transcript_queue = asyncio.Queue()
    await websocket.accept()
    try:
        # Start the transcription process
        dg_connection = await start_transcription(transcript_queue)
        
        # Create a task to process transcripts concurrently
        processor_task = asyncio.create_task(process_transcripts(websocket, transcript_queue))

        # Receive audio stream from the client and send it to Deepgram to transcribe it
        while True:
            data = await websocket.receive_bytes()
            await dg_connection.send(data)
    
    except WebSocketDisconnect:
        print('Client disconnected')
    except Exception as e:
        print(f'Error: {e}')
    finally:
        # Ensure the transcript processor task is canceled if the WebSocket disconnects
        processor_task.cancel()