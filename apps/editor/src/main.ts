import { basicSetup } from "codemirror"
import { EditorView } from "@codemirror/view"
import { keymap } from "@codemirror/view"
import { indentWithTab } from "@codemirror/commands"
import { python } from "@codemirror/lang-python"
import { gruvboxDark } from "cm6-theme-gruvbox-dark"
import "./assets/styles.css"
import { peerExtension } from "./plugin"

const id = Date.now()
const ws = new WebSocket(`ws://127.0.0.1:8000/ws/${id}`);

ws.addEventListener("message", (event) => {
  const data = JSON.parse(event.data)

  if (data["event"] === "run") {
    appendToHistory(data["stdout"])
  }

  if (data["event"] === "getDoc") {
    console.log(data)
  }
})

let { version, doc } = await getDocument()

let mainView = new EditorView({
  doc: doc,
  extensions: [basicSetup, peerExtension(ws, version), python(), keymap.of([indentWithTab]), gruvboxDark],
  parent: document.querySelector<HTMLDivElement>("#editor")!
})

async function getDocument() {
  let doc = await fetch("http://127.0.0.1:8000/doc")
  const json = await doc.json()
  return json
}

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

let editorState = ""
let history: [Date, string][] = []

async function runCode() {
  editorState = mainView.state.doc.toString()
  await fetch("http://127.0.0.1:8000/test", {
    method: "POST",
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({code: editorState}),
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
  const outputDiv = document.querySelector<HTMLDivElement>("#output")
  outputDiv.innerHTML = ""
  history = []
}

function toggleView() {
  const container = document.querySelector<HTMLDivElement>("#editorContainer")
  if (container.className === "vertical") {
    container.className = "horizontal"
  }
  else {
    container.className = "vertical"
  }
}

