from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.transcription import transcribe_audio

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOW_ORIGINS,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

@app.get('/')
async def root():
    return 'Voice Assistant'

@app.websocket('/listen')
async def websocket_listen(websocket: WebSocket):
    await websocket.accept()
    audio_buffer = bytearray()
    try:
        dg_connection = await transcribe_audio(websocket)
        while True:
            data = await websocket.receive_bytes()
            audio_buffer.extend(data)
            await dg_connection.send(data)
    except WebSocketDisconnect:
        print('Client disconnected')
    except Exception as e:
        print(f'Error: {e}')