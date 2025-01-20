from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Response
from fastapi.encoders import jsonable_encoder

from pydantic import BaseModel
from dataclasses import dataclass

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


class DocumentResponse(BaseModel):
    version: int
    doc: str


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

    async def broadcast_pull(self, msg, sender):
        for ws in self.connections:
            if ws.id == sender:
                continue
            await ws.send_text(msg)


class DocumentManager:
    def __init__(self):
        self.updates: list[str] = []
        self.pending: list[str] = []
        self.document: str = ""

    def pushUpdate(self, update: dict):
        formatted = {
            "operation": update["type"],
            "from": update["range"][0],
            "to": update["range"][1],
            "insert": update["payload"],
            "id": update["id"],
        }
        self.pending.append(formatted)
        # print(self.updates)

    def popPending(self):
        if len(self.pending) > 0:
            return self.pending.pop()

    def pullUpdate(self, version: int):
        if version < len(self.updates):
            return (self.updates[version:], version)
        return ([], 0)

    def updateDoc(self, operation: str, start: int, end: int, payload: str, id: str):
        if operation == "insert":
            if (self.document):
                print(f"payload vs doc: {payload} {self.document[start:end + 1]}", id)
                if (self.document[start:end + 1] == payload):
                    print("already added", id)
                    return

            self.document = self.document[:start] + payload + self.document[end:]

        if operation == "delete":
            print(f"remove {start} to {end}")

            if (self.document):
                print(f"removing from start to end {start}-{end}", id)
                if (self.document[start:end] == payload):
                    print("already removed", id)

            self.document = self.document[:start] + self.document[end:]

        formatted = {
            "from": start,
            "to": end,
            "insert": payload,
            "id": id
        }
        self.updates.append(formatted)
        print(self.updates)

        print(self.document)

    def getDocument(self):
        return self.document


socketManager = SocketManager()
documentManager = DocumentManager()


@app.get("/doc")
async def getDoc():
    data = {
        "version": len(documentManager.updates),
        "doc": documentManager.getDocument(),
    }
    return data


@app.post("/test")
async def test(rawCode: InputBody):
    # redirect the sysout and syserr to custom buffer
    buffer = io.StringIO()
    sys.stdout = buffer
    sys.stderr = buffer

    # run the code
    try:
        exec(documentManager.getDocument())
    except Exception as err:
        print(err)

    sys.stdout = sys.__stdout__

    event = {"event": "run", "stdout": buffer.getvalue()}

    await socketManager.broadcast(json.dumps(event))

    return Response(content=buffer.getvalue(), media_type="text/plain")


@app.websocket("/ws/{id}")
async def websocket_endpoint(websocket: WebSocket, id: int):
    await socketManager.connect(websocket, id)
    try:
        while True:
            data = await websocket.receive_text()
            loaded = json.loads(data)
            event = event_helper(loaded)

            if event:
                await socketManager.broadcast(json.dumps(event))

    except WebSocketDisconnect:
        socketManager.disconnect(websocket)


def event_helper(loaded) -> dict:

    if loaded["event"] == "push":
        """
        loaded["change"]
          type: "insert" | "delete"
          range: [int, int]
          payload: str
          changeSet: str
        """
        documentManager.pushUpdate(loaded["change"])

        while len(documentManager.pending) > 0:
            current_operation = documentManager.popPending()
            documentManager.updateDoc(
                current_operation["operation"],
                current_operation["from"],
                current_operation["to"],
                current_operation["insert"],
                current_operation["id"]
            )

    if loaded["event"] == "pull":
        state = documentManager.pullUpdate(int(loaded["version"]))
        return {"event": "pull", "payload": state[0], "version": state[1]}
