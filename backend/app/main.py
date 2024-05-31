from fastapi import FastAPI, WebSocket, WebSocketDisconnect
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
    
    try:
        await assistant.run()
    except WebSocketDisconnect:
        print('Client disconnected')
    except Exception as e:
        print(f'Error: {e}')
    finally:
        pass
        # TODO: Need to cleanup resources (processor_task.cancel() and dg_connection.finish())
        # when the assistant stops running or the websocket connection is closed
