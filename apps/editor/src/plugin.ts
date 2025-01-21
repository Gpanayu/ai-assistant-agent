import { EditorView } from "@codemirror/view"
import { ViewUpdate, ViewPlugin } from "@codemirror/view"
import { ChangeSet } from '@codemirror/state'
import { collab, getSyncedVersion, receiveUpdates, sendableUpdates, Update } from "@codemirror/collab"

type EditOperation = {
  type: "insert" | "delete" | "retain",
  range: readonly [number, number],
  payload: string,
  version: number,
  id: string,
}

export function peerExtension(ws: WebSocket, _version: number) {
  let plugin = ViewPlugin.fromClass(class {
    private head: number
    private cursor: Line
    private col: number
    private version: number
    private id: string

    private editOperation: EditOperation

    constructor(private view: EditorView) {
      this.version = _version
      this.id = Math.floor(Math.random() * 1e9).toString(36)

      ws.addEventListener("message", (event) => {
        const data = JSON.parse(event.data)

        if (data["event"] === "push") {
          console.log(JSON.parse(data["data"]))

        }

        if (data["event"] === "pull") {
          const changes = data["payload"]
          const version = data["version"]
          for (let change of changes) {
            if (change.id === this.id) {
              continue
            }
            console.log(change.id, version)
            const newTransaction = this.view.state.update({ changes: change })
            this.view.dispatch(newTransaction)
          }
        }
      })

      ws.onopen = (_event) => {
        console.log('socket opened')
        ws.send(JSON.stringify({
          event: "pull",
          version: this.version
        }))
      }

      this.editOperation = {
          type: "insert",
          range: [0, 0],
          payload: "",
          version: this.version,
          id: this.id,
      }


      // used for init purposes
      this.updateCursor()

      this.pull()

      setInterval(() => this.updateCursor(), 5000)
    }

    updateCursor() {
      this.head = this.view.state.selection.main.head;
      this.cursor = this.view.state.doc.lineAt(this.head);
      this.col = this.head - this.cursor.from
    }

    update(update: ViewUpdate) {
      if (update.docChanged) {

        // cannot use codemirror extension to parse bc of python, need to update
        // doc manually
        update.changes.iterChanges((fromA, toA, _fromB, _toB, insert) => {
          const insertText = insert.sliceString(0, insert.length, '\n')
          if (fromA !== toA) {
            console.log(`delete:[${fromA}, ${toA}]`)
            this.editOperation.type = "delete"
            this.editOperation.range = [fromA, toA]
            this.editOperation.payload = ""
          }
          if (insertText.length > 0) {
            console.log(`insert@${fromA}: ${insertText}`)
            this.editOperation.type = "insert"
            this.editOperation.range = [fromA, toA]
            this.editOperation.payload = insertText
          }
        })

        this.editOperation.version += 1

        this.version = this.editOperation.version
        console.log(this.version)

        this.updateCursor()
        this.push(this.editOperation)
      }
    }

    push(change: EditOperation) {
      ws.send(JSON.stringify({
        event: "push",
        change: change,
        cursor: [this.cursor.number, this.col],
      }))
    }

    pull() {
      setInterval(() => {
        ws.send(JSON.stringify({
          event: "pull",
          version: this.version
        }))
      }, 500)
      // while (!this.done) {
      // }
    }
  })

  return [plugin]
}
