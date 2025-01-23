from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Response

from pydantic import BaseModel

import sys
import io

import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Vite's default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class InputBody(BaseModel):
    code: str


class SocketManager:
    def __init__(self):
        self.connections: list[WebSocket] = []

    async def connect(self, ws: WebSocket, id: int):
        await ws.accept()
        ws.id = id
        self.connections.append(ws)

    def disconnect(self, ws: WebSocket):
        self.connections.remove(ws)
        print(self.connections)

    async def broadcast(self, msg: str):
        for ws in self.connections:
            await ws.send_text(msg)


socketManager = SocketManager()


@app.post("/test")
async def test(rawCode: InputBody):
    # redirect the sysout and syserr to custom buffer
    buffer = io.StringIO()
    sys.stdout = buffer
    sys.stderr = buffer

    # run the code
    try:
        exec(rawCode.code)
    except Exception as err:
        print(err)

    sys.stdout = sys.__stdout__

    event = {"event": "run", "stdout": buffer.getvalue()}

    await socketManager.broadcast(json.dumps(event))

    return Response(content=buffer.getvalue(), media_type="text/plain")


@app.websocket("/ws/{id}")
async def websocket_endpoint(websocket: WebSocket, id: str):
    await socketManager.connect(websocket, id)
    try:
        while True:
            await websocket.receive_text()

    except WebSocketDisconnect:
        socketManager.disconnect(websocket)
