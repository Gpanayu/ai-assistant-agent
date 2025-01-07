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

function printState() {
  editorState = mainView.state.doc.toString()
  console.log(editorState)
}

document.querySelector("#printState").addEventListener("click", printState);

document.querySelector<HTMLDivElement>("#output")!.innerHTML = editorState
