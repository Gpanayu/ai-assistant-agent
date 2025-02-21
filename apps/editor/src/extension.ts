import {EditorView, ViewPlugin, ViewUpdate} from "@codemirror/view"

export function extension(ws: WebSocket) {
  return ViewPlugin.fromClass(class {
    constructor(private view: EditorView) {}

    update(update: ViewUpdate) {
      if (update.docChanged) {
        ws.send(JSON.stringify({
          event: "updatePlayground",
          payload: {
            "doc": this.view.state.doc.toString()
          }
        }))
      }
    }
  })
}
