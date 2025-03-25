import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from fastapi import Response
from typing import Dict, Callable, List, Optional
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
from collections import ChainMap
import json
import requests
import study_problem_sol
from datetime import datetime, timedelta
from fastapi_utilities import repeat_every

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


class ReplyBody(BaseModel):
    id: str
    choice: str
    text: Optional[str]


class SocketManager:
    def __init__(self):
        self.connections: list[WebSocket] = []
        self.total_seconds=20*60
        self.countdown_task = None

    async def connect(self, ws: WebSocket, id: int):
        await ws.accept()
        ws.id = id
        self.connections.append(ws)
        global state
        conns = [conn for conn in self.connections if conn.id != "control"]

        if len(conns) == 1:
            self.total_seconds=20*60
            self.countdown_task = asyncio.create_task(self.broadcast_countdown())
            print("Starting countdown")

        if len(conns) == 1 and ws.id != "control":
            with open("study_problem_blank.py", "r") as file:
                code = file.read()
                print(state)
                if state == "":
                    msg = json.dumps({"event": "initial", "payload": {"doc": code}})
                    await self.broadcast(msg)

    def disconnect(self, ws: WebSocket):
        self.connections.remove(ws)
        conns = [conn for conn in self.connections if conn.id != "control"]
        if len(conns) == 0:
            self.total_seconds = 0
            if self.countdown_task:
                self.countdown_task.cancel()
                print("Cancelling countdown")
        

    async def broadcast(self, msg: str):
        for ws in self.connections:
            await ws.send_text(msg)

    async def direct_message(self, msg: str, id: str):
        for ws in self.connections:
            if ws.id == id:
                await ws.send_text(msg)

    async def broadcast_countdown(self):
        while self.total_seconds > 0:
            minutes, seconds = divmod(self.total_seconds, 60)
            event={
                "event": "countdown",
                "payload": {"minutes": minutes, "seconds": seconds
                            }
            }
            await self.broadcast(json.dumps(event))
            self.total_seconds -= 1
            await asyncio.sleep(1)
        await self.broadcast(json.dumps({"event" : "countDownEnd"}))

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

        self.completed = 0
        self.total = 0
        self.desc = desc
        self.concepts = concepts
        self.start_time = None

    def update_status(self, id: str):
        if self.work_status != 2:
            if self.claimed_by == "" and self.work_status == 0:
                self.claimed_by = id
                self.work_status = 1
                self.start_time = datetime.now()
            elif self.claimed_by == id and self.work_status == 1:
                self.claimed_by = ""
                self.work_status = 0
                self.start_time = None

    async def update_completed(self, completed: int, remaining: int):
        if self.claimed_by != "":
            if completed == remaining:
                self.work_status = 2
                event = {
                    "event": "notification",
                    "payload": {"prompt": "", "options": []},
                }
                await socketManager.direct_message(id=self.claimed_by, msg=json.dumps(event))
            else:
                self.work_status = 1
            self.total = remaining
            self.completed = completed


def get_time_diff(start_time: datetime) -> int:
    return int((datetime.now() - start_time).total_seconds())


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

    def update_status(self, node_id: str, id: str):
        self.graph[node_id].update_status(id)

    async def update_completed(self, node_id: str, completed: int, remaining: int):
        await self.graph[node_id].update_completed(completed, remaining)
        work_statuses = [
            {node: graph_manager.graph[node].work_status}
            for node in graph_manager.graph
        ]

        event = {
            "event": "updateGraph",
            "payload": {"graph": dict(ChainMap(*work_statuses))},
        }
        await socketManager.broadcast(json.dumps(event))


class EditorManager:
    def __init__(self):
        self.master = ""
        self.individual = {}

    def update_master(self, state):
        self.master = state

    def update_individual(self, id, state):
        self.individual[id] = state

    def get_ollama_response(self, prompt=""):
        api_url = "http://prime-lab.cs.vt.edu:11434/api/generate"
        print(prompt)
        try:
            headers = {
                    "Content-Type": "application/json"
            }
            payload = {
                    "model": "gemma3:27b",
                    "prompt": prompt,
                    "stream": False,
            }
            response = requests.post(url=api_url, data=json.dumps(payload), headers=headers)
            if response.status_code == 200:
                return response.json()
            else:
                return {"error": f"Request failed with status code {response.status_code}", "details": response.text}
        except requests.exceptions.RequestException as e:
            return {"error": str(e)}

    def generate_options_for_helping(self, id: str, task: str, time: int) -> str:
        """
        Generates help options for the user to choose from
        """
        prompt = (f"Pretend you are a teacher. User {id} has completed {task} in {time} seconds \n")

        conversion = {
                0: "not-started",
                1: "started",
                2: "complete"
                }

        work_statuses = [
            {node: conversion[graph_manager.graph[node].work_status]}
            for node in graph_manager.graph
        ]

        current_state = dict(ChainMap(*work_statuses))
        thing = "\n ".join([f"{key} is {value}" for key, value in current_state.items()])
        prompt += f"Here is the current state of the project: {thing}\n"
        prompt += (
            """The tasks are linked like this:
            (Customer, view_menu)
            (Customer, create_order)
            (Restaurant, inventory_helper)
            (Restaurant, restock_inventory)
            (Restaurant, cook_time_helper)
            (create_order, view_order_summary)
            (create_order, calculate_order_cost)
            (create_order, clear_order)
            (create_order, add_to_queue)
            (view_order_summary, get_receipt)
            (calculate_order_cost, add_to_order)
            (calculate_order_cost, remove_from_order)
            (inventory_helper, cook_order)
            (cook_time_helper, cook_order)
            (add_to_queue, cook_order)
            (cook_time_helper, average_cook_time)
            \n"""

                )

        prompt += (f"Based on the state of the project "
                   f"Suggest 3 options for {id}. 1 option should consider "
                   "their teammate's code and give context to how close they are"
                   "to completing, "
                   f"another option should be a direct dependency of {task}, the final "
                   f"option should not be a dependency of {task}."
                   "Give 1 sentence of context and an approximate time in seconds "
                   "estimate for each suggestion\n"
                   "Return as an array {{suggestion, time}}. "
                   "Only return this array")

        response = self.get_ollama_response(prompt=prompt)
        cleaned = re.sub(r'```json\n|```', '', response.get("response")).strip()
        data = json.loads(cleaned)
        return data

    def completeness_check(self, id):
        prompt = ""
        for editor_id, state in self.individual.items():
            if editor_id == id:
                continue
            prompt += f"User {editor_id} has code: \n {state}\n"
            try:
                parsed_code = ast.parse(dedent(state))
                for node in parsed_code.body:
                    if isinstance(node, ast.FunctionDef):
                        function_name = node.name
                        if hasattr(study_problem_sol, function_name):
                            solution_function = getattr(study_problem_sol, function_name)
                            prompt += f"The doc string for the function {function_name} is: {solution_function.__doc__}\n"
            except Exception as e:
                prompt += f"Error parsing code: {e}\n"

        prompt += ("How close is each user to finishing their task?\n"
                   "Return as an array {{name, completeness, explanation}}. "
                   "Only return this array")

        response = self.get_ollama_response(prompt=prompt)
        # cleaned = re.sub(r'```json\n|```', '', response.get("response")).strip()
        # data = json.loads(cleaned)
        return response.get("response")


class FunctionReplacer:
    def __init__(self, main_file: str, main_copy_file: str):
        self.main_file = main_file
        self.main_copy_file = main_copy_file
        self.function_name = ""
        self.test_full = False

    def replace_whole_file(self, new_code: str):
        with open(self.main_file, "w") as f:
            f.write(new_code)
        self.test_full = True
        print(f"Replaced {self.main_file} with new code")

    def replace_function_in_file(self, function_code: str):
        self.test_full = False
        try:
            parsed_code = ast.parse(dedent(function_code))
        except SyntaxError as e:
            print(f"Error: Invalid Python syntax in function code.\n{e}")
            return

        function_node = None
        for node in parsed_code.body:
            if isinstance(node, ast.FunctionDef):
                function_node = node
                break

        if function_node is None:
            print("Error: Provided code does not contain a valid function definition.")
            return

        function_name = function_node.name
        self.function_name = function_name

        with open(self.main_file, "r") as f:
            content = f.read()
            tree = ast.parse(content)

        class FunctionTransformer(ast.NodeTransformer):
            def visit_FunctionDef(self, node):
                if node.name == function_name:
                    return function_node
                return node

        new_tree = FunctionTransformer().visit(tree)
        new_code = ast.unparse(new_tree)

        with open(self.main_file, "w") as f:
            f.write(new_code)

    async def run_tests(self,user):
        try:
            print("Running test cases...")
            test_cases = ""
            if not self.test_full:
                parts = re.split(r"_", self.function_name, maxsplit=2)
                test_cases = f"{parts[0]}_{parts[1]}"
                print(f"test_{test_cases}")

            result = subprocess.run(
                [
                    sys.executable,
                    "-m",
                    "pytest",
                    "test_study_problem.py",
                    "-k",
                    test_cases,
                    "-vv",
                    "--color=no"
                    # "--tb=short",
                    # "-q",
                ],
                capture_output=True,
                text=True,
            )

            if not self.test_full:
                match = re.search(r"=+ (\d+) passed.*(?:, (\d+) failed)?",
                                  result.stdout)
                passed = int(match.group(1)) if match else 0

                selected_match = re.search(r"collected (\d+) items / (\d+) deselected / (\d+) selected",
                                           result.stdout)
                total_selected = int(selected_match.group(3)) if selected_match else 0

                await graph_manager.update_completed(
                    node_id=self.function_name,
                    completed=passed,
                    remaining=total_selected,
                )

            print(result.stdout)
            # print(result.stderr)
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

msgs = []
state = ""
cursor_positions = {}
help_queue = []


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
        await replacer.run_tests(rawCode.channel)
        replacer.restore_main_file

    else:
        replacer = FunctionReplacer("study_problem_tester.py", "study_problem_sol.py")
        replacer.replace_function_in_file(rawCode.code)
        await replacer.run_tests(rawCode.channel)
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

                work_statuses = [
                    {node: graph_manager.graph[node].work_status}
                    for node in graph_manager.graph
                ]
                event = {
                    "event": "updateGraph",
                    "payload": {"graph": dict(ChainMap(*work_statuses))},
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
                event = {
                    "event": "updateGraph",
                    "payload": {"graph": dict(ChainMap(*work_statuses))},
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
        if looked_up.total != 0:
            html_str += (
                f"<p>Progress: <b>{looked_up.completed}/{looked_up.total}</b></p>"
            )

        return {"html": html_str}
    return {"html": ""}


@app.post("/reply")
def reply_to_notif(body: ReplyBody):
    # user_response(body.id, body.choice)
    print(body.id, body.choice)
    if body.choice == "":
        pass

    for user, state in editor_manager.individual.items():
        prompt = f"\nUser {user} current code is: {state}\n"

        try:
            parsed_code = ast.parse(dedent(state))
            for node in parsed_code.body:
                if isinstance(node, ast.FunctionDef):
                    function_name = node.name
                    if hasattr(study_problem_sol, function_name):
                        solution_function = getattr(study_problem_sol, function_name)
                        prompt += f"Solution for {function_name} is: {solution_function.__doc__}\n"
        except Exception as e:
            prompt += f"Error parsing code: {e}\n"


# @app.on_event("startup")
# @repeat_every(seconds=30)
# async def monitor_progress():
#     print(editor_manager.individual)
#
#     prompt = f"""You are a teacher and User {userWhoRequestedHelp} is stuck on the
#     following code: {blaring_code}. Please select a teammate to help. Check
#     whoever is closer to their individual solution. Give\n"""
#
#     editor_manager.get_ollama_response()
#
#     print("hi")


class Chat(BaseModel):
    chat: str
    time: int
    task: str


@app.post("/ollama")
async def ollama(flex: Chat):
    # response = editor_manager.generate_options_for_helping(
    #     flex.chat, flex.task, flex.time
    # )
    response = editor_manager.completeness_check(flex.chat)
    # response = editor_manager.get_ollama_response()
    return response
