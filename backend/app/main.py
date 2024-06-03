from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.assistant import Assistant

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOW_ORIGINS,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

@app.websocket('/listen')
async def websocket_listen(websocket: WebSocket):
    await websocket.accept()
    assistant = Assistant(websocket)
    await assistant.run()
