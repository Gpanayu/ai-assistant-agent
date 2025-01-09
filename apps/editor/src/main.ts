import { EditorView, basicSetup } from "codemirror"
import { keymap } from "@codemirror/view"
import { indentWithTab } from "@codemirror/commands"
import { python } from "@codemirror/lang-python"
import { gruvboxDark } from "cm6-theme-gruvbox-dark"

import "./assets/styles.css"

let mainView = new EditorView({
  doc: "print('hello')\n",
  extensions: [basicSetup, python(), keymap.of([indentWithTab]), gruvboxDark],
  parent: document.querySelector<HTMLDivElement>("#editor")
})

let editorState = ""
let history: [Date, string][] = []

async function runCode() {
  editorState = mainView.state.doc.toString()
  console.log(editorState)
  const res = await fetch("http://127.0.0.1:8000/test", {
    method: "POST",
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({code: editorState}),
  })
  const output = await res.text()
  appendToHistory(output)
}

function appendToHistory(output: string) {
  history.push([new Date(), output])

  const outputDiv = document.querySelector<HTMLDivElement>("#output")
  outputDiv.innerHTML = ""

  for (let i = 0; i < history.length; i++) {
    let command = history[i]
    const node = document.createElement("div");
    node.className = "outputLine"
    node.innerHTML = `
      <p>${command[1]}</p>
      <p>${command[0].toLocaleTimeString()}</p>
    `
    if (i % 2 === 0) {
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

document.querySelector("#run").addEventListener("click", runCode);
document.querySelector("#clear").addEventListener("click", clearCode);

