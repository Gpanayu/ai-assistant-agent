import { basicSetup } from "codemirror"
import { EditorView } from "@codemirror/view"
import { python } from "@codemirror/lang-python"

import {Tooltip, showTooltip} from "@codemirror/view"
import {StateField} from "@codemirror/state"
import {EditorState} from "@codemirror/state"

const cursorTooltipBaseTheme = EditorView.baseTheme({
  ".cm-tooltip.cm-tooltip-cursor": {
    backgroundColor: "#66b",
    color: "white",
    border: "none",
    padding: "2px 7px",
    borderRadius: "4px",
    "& .cm-tooltip-arrow:before": {
      borderTopColor: "#66b"
    },
    "& .cm-tooltip-arrow:after": {
      borderTopColor: "transparent"
    }
  }
})

function getCursorTooltips(state: EditorState): readonly Tooltip[] {
  return state.selection.ranges
    .filter(range => range.empty)
    .map(range => {
      let line = state.doc.lineAt(range.head)
      let text = line.number + ":" + (range.head - line.from)
      return {
        pos: range.head,
        above: true,
        strictSide: true,
        arrow: true,
        create: () => {
          let dom = document.createElement("div")
          dom.className = "cm-tooltip-cursor"
          dom.textContent = text
          return {dom}
        }
      }
    })
}

const cursorTooltipField = StateField.define<readonly Tooltip[]>({
  create: getCursorTooltips,

  update(tooltips, tr) {
    if (!tr.docChanged && !tr.selection) return tooltips
    return getCursorTooltips(tr.state)
  },

  provide: f => showTooltip.computeN([f], state => state.field(f))
})


const ws = new WebSocket("wss://0.0.0.0:8000/ws/control");

let view: EditorView | null = null;
let lastDoc = ""

ws.addEventListener("message", (event) => {
  const data = JSON.parse(event.data)
  if (data["event"] === "initial" || data["event"] === "document_update") {
    console.log(data)
    const newDoc = data["payload"]["doc"]
    if (lastDoc !== newDoc) {
      lastDoc = newDoc
      view?.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: newDoc }
      });
    }
  }

  if (data["event"] === "monitorPlayground") {
    const map = data["payload"]["editors"]
    const individualsDiv = document.getElementById("individuals");
    if (individualsDiv) {
      individualsDiv.innerHTML = "";
      for (let key of Object.keys(map)) {
        const value = map[key];

        // Create a new div element
        const entryDiv = document.createElement("div");
        const editor = document.createElement("p");
        entryDiv.textContent = `${key}`;
        editor.textContent = `${value}`;
        editor.style.whiteSpace = "pre-line"
        entryDiv.appendChild(editor)

        // Append to the "individuals" div
        individualsDiv.appendChild(entryDiv);
      }

    }
  }
})


view = new EditorView({
  doc: "",
  extensions: [basicSetup, python(), EditorView.editable.of(false)],
  // extensions: [basicSetup, python()],
  parent: document.querySelector<HTMLDivElement>("#view")!
})


document.getElementById("fetch")?.addEventListener("click", getState)

async function getState() {
  const data = await fetch('https://0.0.0.0:8000/fetch')
  const thing = await data.json()
  view?.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: thing["state"] }
  });

  const map = thing["individual"]
  const individualsDiv = document.getElementById("individuals");

  if (individualsDiv) {
    individualsDiv.innerHTML = "";
    for (let key of Object.keys(map)) {
      const value = map[key];

      // Create a new div element
      const entryDiv = document.createElement("div");
      const editor = document.createElement("p");
      entryDiv.textContent = `${key}`;
      editor.textContent = `${value}`;
      editor.style.whiteSpace = "pre-line"
      entryDiv.appendChild(editor)

      // Append to the "individuals" div
      individualsDiv.appendChild(entryDiv);
    }
  }

  const participants = document.getElementById("participants")

  const users = thing["users"]

  if (participants) {
    participants.innerHTML = ""
    for (let key of users) {
      const label = document.createElement("label");
      label.textContent = key;
      const user = document.createElement("input");
      user.type = "checkbox";
      user.id = key;
      user.name = "selected_users[]";
      label.prepend(user);
      participants.append(label)
    }
  }
}
