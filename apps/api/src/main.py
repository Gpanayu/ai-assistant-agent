from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from fastapi import Response
from fastapi.staticfiles import StaticFiles
from typing import Dict, Callable, List
from deepgram import DeepgramClient
from dotenv import load_dotenv
import os
from pydantic import BaseModel
import subprocess
import re
import sys
import io
import ast
from textwrap import dedent
import csv

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


class NotifyBody(BaseModel):
    users: List[str]
    options: List[str]


class SocketManager:
    def __init__(self):
        self.connections: list[WebSocket] = []

    async def connect(self, ws: WebSocket, id: int):
        await ws.accept()
        ws.id = id
        self.connections.append(ws)
        global state
        conns = [conn for conn in self.connections if conn.id != "control"]
        if len(conns) == 1 and ws.id != "control":
            with open("study_problem_sol.py", "r") as file:
                code = file.read()
                print(state)
                if state == "":
                    msg = json.dumps({"event": "initial", "payload": {"doc": code}})
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


class GraphNode:
    def __init__(self, name: str, desc: str, concepts: str):
        self.name = name
        self.claimed_by = ""

        # 0 - not claimed
        # 1 - working
        # 2 - done
        self.work_status = 0

        self.tasks = 0
        self.completion = 0
        self.desc = desc
        self.concepts = concepts

    def update_status(self, id: str):
        if self.work_status != 2:
            if self.claimed_by == "" and self.work_status == 0:
                self.claimed_by = id
                self.work_status = 1
            elif self.claimed_by != "" and self.work_status == 1:
                self.claimed_by = ""
                self.work_status = 0


class GraphManager:
    def __init__(self):
        self.graph: Dict[str, GraphNode] = {}

        with open("functions.csv", newline="") as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                self.graph[row["Function"]] = GraphNode(
                    name=row["Function"],
                    desc=row["description"],
                    concepts=row["Concepts"],
                )
        print(self.graph)

    def update_status(self, node_id: str, id: str):
        self.graph[node_id].update_status(id)


class EditorManager:
    def __init__(self):
        self.master = ""
        self.individual = {}

    def update_master(self, state):
        self.master = state

    def update_individual(self, id, state):
        self.individual[id] = state


class FunctionReplacer:
    def __init__(self, main_file: str, main_copy_file: str):
        self.main_file = main_file
        self.main_copy_file = main_copy_file

    def replace_whole_file(self, new_code: str):
        with open(self.main_file, "w") as f:
            f.write(new_code)
        print(f"Replaced {self.main_file} with new code")

    def replace_function_in_file(self, function_code: str):
        function_node = ast.parse(dedent(function_code)).body[0]
        if not isinstance(function_node, ast.FunctionDef):
            print("Error: Provided code is not a function definition.")
            return

        function_name = function_node.name

        with open(self.main_file, "r") as f:
            content = f.read()
            tree = ast.parse(content)

        class FunctionTransformer(ast.NodeTransformer):
            def visit_FunctionDef(self, node):
                if node.name == function_name:
                    return function_node  # Replace the old function with the new one
                return node

        new_tree = FunctionTransformer().visit(tree)
        new_code = ast.unparse(new_tree)

        with open(self.main_file, "w") as f:
            f.write(new_code)

        print(f"Replaced function '{function_name}' in {self.main_file}")

    def run_tests(self):
        try:
            print("Running test cases...")
            result = subprocess.run(
                [
                    sys.executable,
                    "-m",
                    "pytest",
                    "test_study_problem.py",
                    "--tb=short",
                    "-q",
                    "--disable-warnings",
                    "--color=no",
                ],
                capture_output=True,
                text=True,
            )
            print(result.stdout)
            print(result.stderr)
        except Exception as e:
            print("Error running tests:", e)

    def restore_main_file(self):
        with open(self.main_copy_file, "r") as src, open(self.main_file, "w") as dest:
            dest.write(src.read())
        print(f"Restored {self.main_file} to its original state")


socketManager = SocketManager()

templates = Jinja2Templates(directory="templates")
audio_processor = AudioProcessor()

graph_manager = GraphManager()

editor_manager = EditorManager()


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
        "dash.html", {"request": request, "connections": socketManager.connections}
    )


@app.post("/notify")
async def push_notification(notification: NotifyBody):
    print(notification)

    users = notification.users
    options = notification.options

    prompt = "Hey looks like you are finishing up with your task!\nHere are some suggestions:"
    parsed_options = []
    for i in options:
        if i == "1":
            parsed_options.append("Check in with your teammate")
        if i == "2":
            parsed_options.append("Work on task down the tree")
        if i == "3":
            parsed_options.append("Work on task on the same level")
        if i == "4":
            parsed_options.append("Wait for your team to catch up")
        if i == "5":
            parsed_options = []
            prompt = "Hey looks like you are working on this for a while, would you like help?"
            parsed_options.append("Yes, help would be nice")
            parsed_options.append("No, I am good")

    for i in users:
        await socketManager.direct_message(
            json.dumps(
                {
                    "event": "notification",
                    "payload": {"prompt": prompt, "options": parsed_options},
                }
            ),
            i,
        )
    return {"ok": 200}


@app.post("/testFunction")
async def testFunction(rawCode: InputBody):
    buffer = io.StringIO()
    sys.stdout = buffer
    sys.stderr = buffer
    if rawCode.channel == "all":
        replacer = FunctionReplacer("study_problem_tester.py", "study_problem_sol.py")
        replacer.replace_whole_file(rawCode.code)
        replacer.run_tests()
        replacer.restore_main_file

    else:
        replacer = FunctionReplacer("study_problem_tester.py", "study_problem_sol.py")
        replacer.replace_function_in_file(rawCode.code)
        replacer.run_tests()
        replacer.restore_main_file()

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


@app.post("/test")
async def test(rawCode: InputBody):
    # redirect the sysout and syserr to custom buffer
    buffer = io.StringIO()
    sys.stdout = buffer
    sys.stderr = buffer

    # run the code
    # probably should implement this later: https://restrictedpython.readthedocs.io/en/latest/
    try:
        exec(rawCode.code, {"__builtins__": __builtins__})
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
cursor_positions = {}


@app.websocket("/ws/{id}")
async def websocket_text_endpoint(websocket: WebSocket, id: str):
    await socketManager.connect(websocket, id)
    global state
    try:
        while True:
            data = await websocket.receive_text()
            loaded = json.loads(data)
            if loaded["event"] == "updateMaster":
                msgs.append(loaded["payload"])

                if loaded["payload"]["doc"] != state:
                    state = loaded["payload"]["doc"]
                    cursor_positions[id] = loaded["payload"]["cursor"]
                    event = {
                        "event": "document_update",
                        "payload": {
                            "doc": state,
                            "user": id,
                            "cursors": cursor_positions,
                        },
                    }
                    await socketManager.broadcast(json.dumps(event))

            if loaded["event"] == "updatePlayground":
                editor_manager.update_individual(id, loaded["payload"]["doc"])
                event = {
                    "event": "monitorPlayground",
                    "payload": {"editors": editor_manager.individual},
                }
                await socketManager.broadcast(json.dumps(event))

            if loaded["event"] == "updateNode":
                graph_manager.update_status(
                    node_id=loaded["payload"]["node"], id=loaded["payload"]["id"]
                )
                work_statuses = [
                    {node: graph_manager.graph[node].work_status}
                    for node in graph_manager.graph
                ]
                print(work_statuses)
                event = {
                    "event": "updateGraph",
                    "payload": {"graph": work_statuses},
                }
                await socketManager.broadcast(json.dumps(event))

    except WebSocketDisconnect:
        socketManager.disconnect(websocket)


@app.get("/fetch")
def get_editors():
    users = [conn.id for conn in socketManager.connections if conn.id != "control"]
    event = {
        "users": set(users),
        "state": state,
        "individual": editor_manager.individual,
    }
    return event


@app.get("/lookup/{node}")
def lookup_description(node):
    if node in graph_manager.graph:
        looked_up = graph_manager.graph[node]
        html_str = f"<p>{looked_up.desc}</p><i>{looked_up.concepts}</i>"
        if looked_up.claimed_by != "":
            html_str += f"<p>Claimed by <b>{looked_up.claimed_by}</b></p>"
        return {"html": html_str}
    return {"html": ""}
