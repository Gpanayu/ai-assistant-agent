from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from fastapi import Response
from typing import Dict, Callable
from deepgram import DeepgramClient
from dotenv import load_dotenv
import os
from pydantic import BaseModel

import sys
import io

import json

load_dotenv()

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
            msg = json.dumps({"event": "initial", "payload": ""})
            await self.broadcast(msg)

    def disconnect(self, ws: WebSocket):
        self.connections.remove(ws)

    async def broadcast(self, msg: str):
        for ws in self.connections:
            await ws.send_text(msg)

    async def direct_message(self, msg: str, id: str):
        for ws in self.connections:
            if ws.id == id:
                await ws.send_text(msg)


socketManager = SocketManager()

templates = Jinja2Templates(directory="templates")


class AudioProcessor:
    def __init__(self):
        self.dg_client = DeepgramClient(os.getenv("DEEPGRAM_API_KEY"))
        self.socket = None

    async def process_audio(self, fast_socket: WebSocket):
        async def get_transcript(data: Dict) -> None:
            if "channel" in data:
                transcript = data["channel"]["alternatives"][0]["transcript"]
                print(data)
                if transcript:
                    await fast_socket.send_text(transcript)

        self.socket = await self.connect_to_deepgram(get_transcript)

    async def connect_to_deepgram(
        self, transcript_received_handler: Callable[[Dict], None]
    ):
        try:
            socket = await self.dg_client.transcription.live(
                {"punctuate": True, "interim_results": False, "diarize": True}
            )
            socket.registerHandler(
                socket.event.CLOSE, lambda c: print(f"Connection closed with code {c}.")
            )
            socket.registerHandler(
                socket.event.TRANSCRIPT_RECEIVED, transcript_received_handler
            )
            return socket
        except Exception as e:
            raise Exception(f"Could not open socket: {e}")


audio_processor = AudioProcessor()


@app.websocket("/listen")
async def websocket_listen_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        await audio_processor.process_audio(websocket)
        while True:
            data = await websocket.receive_bytes()
            if audio_processor.socket:
                audio_processor.socket.send(data)
    except Exception as e:
        raise Exception(f"Could not process audio: {e}")
    finally:
        await websocket.close()


@app.get("/", response_class=HTMLResponse)
def get(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/dash", response_class=HTMLResponse)
def dashboard(request: Request):
    return templates.TemplateResponse(
        "dash.html", {"request": request, "connections": socketManager.connections, "state": state, "history": history}
    )


@app.post("/notify")
async def push_notification(request: Request):
    data = await request.json()
    print(data["notification_type"])
    notif_msg = ""
    users = data["selected_users"]
    notif_type = data["notification_type"]

    if notif_type == "2":
        notif_msg = f"{users} trade tasks"
    if notif_type == "3":
        notif_msg = f"{users} refocus your effort to an easier task"
    if notif_type == "4":
        notif_msg = f"{users} refocus your effort to a harder task"
    if notif_type == "4":
        notif_msg = f"{users} check in with your teammates"

    event = {"event": "notification", "payload": notif_msg}

    for i in users:
        await socketManager.direct_message(json.dumps(event), i)


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


msgs = []
state = ""
history=[]
cursor_positions = {}

@app.websocket("/ws/{id}")
async def websocket_text_endpoint(websocket: WebSocket, id: str):
    await socketManager.connect(websocket, id)
    global state
    try:
        while True:
            data = await websocket.receive_text()
            loaded = json.loads(data)
            msgs.append(loaded["payload"])
            if loaded["payload"]["doc"] != state:
                state = loaded["payload"]["doc"]
                cursor_positions[id] = loaded["payload"]["cursor"]
                history.append({"doc": state, "user": id})
                event = {
                    "event": "document_update",
                    "payload": {"doc": state, "user": id, "cursor_positions": cursor_positions, "history": history},
                }
                await socketManager.broadcast(json.dumps(event))
            print("state:",state,"cursor_positions:",cursor_positions)

    except WebSocketDisconnect:
        socketManager.disconnect(websocket)
        del cursor_positions[id]

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            event = {
                "event": "document_update",
                "state": state,
                "history": history,
                "cursor_positions": cursor_positions
            }
            await websocket.send_text(json.dumps(event))  
    except WebSocketDisconnect:
        await websocket.close()