import { basicSetup } from "codemirror"
import { EditorView } from "@codemirror/view"
import { keymap } from "@codemirror/view"
import { indentWithTab } from "@codemirror/commands"
import { python } from "@codemirror/lang-python"
import { oneDark } from "@codemirror/theme-one-dark"
import "./assets/styles.css"

import * as Y from 'yjs'
import { yCollab } from 'y-codemirror.next'
import { WebrtcProvider } from 'y-webrtc'

const id = Math.floor(Math.random() * 1e9).toString(36)

const ws = new WebSocket(`ws://127.0.0.1:8000/ws/${id}`);

ws.addEventListener("open", (_) => {
  console.log('socket opened')
})

ws.addEventListener("message", (event) => {
  const data = JSON.parse(event.data)

  if (data["event"] === "run") {
    console.log("ran")
    appendToHistory(data["stdout"])
  }
})

const ydoc = new Y.Doc()
const provider = new WebrtcProvider('prime-collab-room', ydoc)
const ytext = ydoc.getText('codemirror')
const undoManager = new Y.UndoManager(ytext)

ydoc.on('update', _ => {
  console.log(ytext.toString())
})

provider.awareness.setLocalStateField('user', {
  name: 'Anonymous ' + Math.floor(Math.random() * 100),
  color: '#30bced',
  colorLight: '#30bced33'
})

new EditorView({
  doc: ytext.toString(),
  extensions: [basicSetup, python(), keymap.of([indentWithTab]), oneDark, yCollab(ytext, provider.awareness, { undoManager })],
  parent: document.querySelector<HTMLDivElement>("#editor")!
})


/*
+------------------+
|                  |
| HTML Interaction |
|                  |
+------------------+
*/

document.querySelector("#run")!.addEventListener("click", runCode);
document.querySelector("#clear")!.addEventListener("click", clearCode);
document.querySelector("#toggle")!.addEventListener("click", toggleView);

/*
+------------------+
|                  |
| Editor Functions |
|                  |
+------------------+
*/
let history: [Date, string][] = []

async function runCode() {
  await fetch("http://127.0.0.1:8000/test", {
    method: "POST",
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({code: ytext}),
  })
}

function appendToHistory(output: string) {
  history.push([new Date(), output])

  const outputDiv = document.querySelector<HTMLDivElement>("#output")!
  outputDiv.innerHTML = ""

  for (let i = 0; i < history.length; i++) {
    let command = history[i]

    const HOURS = command[0].getHours().toString().padStart(2,"0")
    const MINUTES = command[0].getMinutes().toString().padStart(2,"0")
    const SECONDS = command[0].getSeconds().toString().padStart(2,"0")

    const node = document.createElement("div");
    node.className = "outputLine"
    node.innerHTML = `
      <p>${command[1]}</p>
      <p>${HOURS}:${MINUTES}:${SECONDS}</p>
    `
    if (i % 2 === 1) {
      node.className += " active"
    }

    outputDiv!.appendChild(node)
  }

  outputDiv.scrollTop = outputDiv.scrollHeight - outputDiv.clientHeight;

}

function clearCode() {
  const outputDiv = document.querySelector<HTMLDivElement>("#output")!
  outputDiv.innerHTML = ""
  history = []
}

function toggleView() {
  const container = document.querySelector<HTMLDivElement>("#editorContainer")!
  if (container.className === "vertical") {
    container.className = "horizontal"
  }
  else {
    container.className = "vertical"
  }
}

