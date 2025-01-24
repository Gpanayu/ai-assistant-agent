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
import { YText } from "yjs/dist/src/internals"

const id = Math.floor(Math.random() * 1e9).toString(36)
const ws = new WebSocket(`ws://127.0.0.1:8000/ws/${id}`);

ws.addEventListener("open", (_) => {
  console.log('socket opened')
})

ws.addEventListener("message", (event) => {
  const data = JSON.parse(event.data)
  if (data["event"] === "run") {
    console.log(data)
    appendToHistory(data["stdout"], data["all"])
  }
  if (data["event"] === "initial") {
    ytext.insert(0, data["payload"])
  }
})

export const userColors = [
  { color: '#30bced', light: '#30bced33' },
  { color: '#6eeb83', light: '#6eeb8333' },
  { color: '#ffbc42', light: '#ffbc4233' },
  { color: '#ecd444', light: '#ecd44433' },
  { color: '#ee6352', light: '#ee635233' },
  { color: '#9ac2c9', light: '#9ac2c933' },
  { color: '#8acb88', light: '#8acb8833' },
  { color: '#1be7ff', light: '#1be7ff33' }
]

export const color = userColors[Math.floor(Math.random() * 8) % userColors.length]

const ydoc = new Y.Doc()
const provider = new WebrtcProvider('prime-collab-room', ydoc)
const ytext = ydoc.getText('codemirror')
const undoManager = new Y.UndoManager(ytext)

provider.awareness.setLocalStateField('user', {
  name: id,
  color: color.color,
  colorLight: color.light
})

undoManager.on('stack-item-added', event => {
  event.stackItem.meta.set('cursor-location', mainView.state.selection.main.head)
  event.stackItem.meta.set('user-id', provider.awareness.getLocalState().user.name)
  console.log("undoManager fired")

  let payload = {
    cursor: mainView.state.selection.main.head,
    doc: mainView.state.doc.toString(),
    name: provider.awareness.getLocalState().user.name
  }

  ws.send(JSON.stringify({event: "update", payload: payload}))
})


let mainView = new EditorView({
  doc: ytext.toString(),
  extensions: [basicSetup, python(), keymap.of([indentWithTab]), oneDark, yCollab(ytext, provider.awareness, { undoManager })],
  parent: document.querySelector<HTMLDivElement>("#editor")!
})

let secondaryView = new EditorView({
  doc: "# Personal Playground\n# Code will not be shared with others\n\nprint('hello playground')",
  extensions: [basicSetup, python(), keymap.of([indentWithTab]), oneDark],
  parent: document.querySelector<HTMLDivElement>("#secondary")!
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
document.querySelector("#update")!.addEventListener("click", updateName);

/*
+------------------+
|                  |
| Editor Functions |
|                  |
+------------------+
*/
let history: [Date, string, boolean][] = []

let tabs = document.querySelectorAll(".tab");

for (let i = 0; i < tabs.length; i++) {
  let self = tabs[i];
  self.addEventListener('click', function() {
    let data = this.getAttribute('data-tab');
    document.querySelectorAll('.tab-pane.active')[0].classList.remove('active');
    document.querySelectorAll('.tab-pane[data-pane="'+data+'"]')[0].classList.add('active');
    document.querySelectorAll('.tab.active')[0].classList.remove('active');
    this.classList.add('active');
  });
}

async function runCode() {
  const collab = document.querySelector('.tab-pane[data-pane="0"].active')
  let channel = ""
  let code: string | YText = ""

  if (collab) {
    channel = "all"
    code = ytext
  }
  else {
    channel = id
    code = secondaryView.state.doc.toString()
  }
  await fetch("http://127.0.0.1:8000/test", {
    method: "POST",
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({code: code, channel: channel})
  })
}

function appendToHistory(output: string, all: boolean) {
  history.push([new Date(), output, all])

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

    const authored = document.createElement("span")
    authored.className = "outputLine"
    authored.innerHTML = `<p></p>${command[2] ? '' : '<i>ran from playground</i>'}`
    authored.style.color = "yellow"

    if (i % 2 === 1) {
      node.className += " active"
      authored.className += " active"
    }

    outputDiv!.appendChild(node)
    outputDiv!.appendChild(authored)
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

function updateName() {
  const input = document.querySelector<HTMLInputElement>("#nameInput")!
  console.log(input.value)
  provider.awareness.setLocalStateField('user', {
    name: input.value,
    color: color.color,
    colorLight: color.light
  })
}
