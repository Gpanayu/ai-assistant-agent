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
    channel: str


class SocketManager:
    def __init__(self):
        self.connections: list[WebSocket] = []

    async def connect(self, ws: WebSocket, id: int):
        await ws.accept()
        ws.id = id
        self.connections.append(ws)
        if len(self.connections) == 1:
            """
            TODO: this would be where we configure the initial code
            """
            msg = json.dumps({"event": "initial", "payload": "# Collaborative Editor"})
            await self.broadcast(msg)

    def disconnect(self, ws: WebSocket):
        self.connections.remove(ws)
        print(self.connections)

    async def broadcast(self, msg: str):
        for ws in self.connections:
            await ws.send_text(msg)

    async def direct_message(self, msg: str, id: str):
        for ws in self.connections:
            if ws.id == id:
                await ws.send_text(msg)


socketManager = SocketManager()


@app.post("/test")
async def test(rawCode: InputBody):
    # redirect the sysout and syserr to custom buffer
    buffer = io.StringIO()
    sys.stdout = buffer
    sys.stderr = buffer

    # run the code
    # probably should implement this later: https://restrictedpython.readthedocs.io/en/latest/
    try:
        exec(rawCode.code)
    except Exception as err:
        print(err)

    sys.stdout = sys.__stdout__

    event = {
        "event": "run",
        "stdout": buffer.getvalue(),
        "all": rawCode.channel == "all",
    }

    if rawCode.channel == "all":
        await socketManager.broadcast(json.dumps(event))
    else:
        await socketManager.direct_message(json.dumps(event), rawCode.channel)

    return Response(content=buffer.getvalue(), media_type="text/plain")


@app.websocket("/ws/{id}")
async def websocket_endpoint(websocket: WebSocket, id: str):
    await socketManager.connect(websocket, id)
    try:
        while True:
            data = await websocket.receive_text()
            loaded = json.loads(data)
            print(loaded["payload"])

    except WebSocketDisconnect:
        socketManager.disconnect(websocket)
