import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels"
import { Button, Title, Container, Affix, Group, Modal } from "@mantine/core"
import { useDisclosure } from '@mantine/hooks';
import styles from "./Editor.module.css"
import { yCollab } from 'y-codemirror.next';
import * as Y from 'yjs';
import ReactAnsi from "react-ansi";
import { WebrtcProvider } from 'y-webrtc';
import Tree from './Tree'
import { channel } from 'diagnostics_channel';
import HelpModal from './modals/HelpModal';
import { useEffect, useState,useRef } from 'react';
import { cursorTo } from 'readline';
import { timeStamp } from 'console';
import GraphComponent from './SMM';
import { Background, ReactFlowProvider } from '@xyflow/react';
import { blob } from 'stream/consumers';
import CollaborativeOpportunityModal from './modals/CollabModal';
import { EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { Extension } from "@codemirror/state";
import {createPersonalEditorUpdateExtension} from './modals/extension';
import HelpSessionStartedModal from './modals/HelpSessionModal';


import { Decoration, WidgetType } from "@codemirror/view";
import { StateField, StateEffect } from "@codemirror/state";

// class PeteWidget extends WidgetType {
//   toDOM(view: EditorView) {
//     const span = document.createElement("span");

//     span.style.background = "#2d2d2d";
//     span.style.color = "white";
//     span.style.padding = "2px 6px";
//     span.style.marginLeft = "8px";
//     span.style.borderRadius = "6px";
//     span.style.fontSize = "12px";
//     span.style.cursor = "pointer";

//     span.innerHTML =
//       "👨‍💻 Pete can help with <b>loop logic</b>";

//     span.onclick = () => {
//       alert("Pete is available! (Demo)");
//     };

//     return span;
//   }
// }



// class PeteWidget extends WidgetType {
//   constructor(private onClick: () => void) {
//     super();
//   }

//   toDOM(view: EditorView) {
//     const span = document.createElement("span");

//     span.style.background = "#2d2d2d";
//     span.style.color = "white";
//     span.style.padding = "2px 6px";
//     span.style.marginLeft = "8px";
//     span.style.borderRadius = "6px";
//     span.style.fontSize = "12px";
//     span.style.cursor = "pointer";

//     span.innerHTML =
//       "👨‍💻 Pete can help with <b>loop logic</b>";

//     span.onclick = this.onClick;

//     return span;
//   }
// }

class PeteWidget extends WidgetType {
  toDOM(view: EditorView) {
    const span = document.createElement("span");

    span.id = "pete-inline-widget"; // 👈 IMPORTANT

    span.style.background = "#2d2d2d";
    span.style.color = "white";
    span.style.padding = "2px 6px";
    span.style.marginLeft = "8px";
    span.style.borderRadius = "6px";
    span.style.fontSize = "12px";
    span.style.cursor = "pointer";

    span.innerHTML =
      "👨‍💻 Pete can help with <b>loop logic</b>";

    span.onclick = () => {
      window.dispatchEvent(new CustomEvent("pete-click"));
    };

    return span;
  }
}

const addPeteEffect = StateEffect.define<number>();

const peteField = StateField.define({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    decorations = decorations.map(tr.changes);

    for (let e of tr.effects) {
      if (e.is(addPeteEffect)) {
        const deco = Decoration.widget({
          widget: new PeteWidget(() => {
            window.dispatchEvent(new CustomEvent("pete-click"));
          }),
          side: 1
        }).range(e.value);

        return Decoration.set([deco]);
      }
    }

    return decorations;
  },
  provide: f => EditorView.decorations.from(f)
});

export default function Editor() {


const defaultCode = `# Convert an integer to Roman numerals

  def int_to_roman(num):
      val = [
          1000, 900, 500, 400,
          100, 90, 50, 40,
          10, 9, 5, 4, 1
      ]
      syms = [
          "M", "CM", "D", "CD",
          "C", "XC", "L", "XL",
          "X", "IX", "V", "IV", "I"
      ]
      roman_num = ""
      i = 0
      while num > 0:
          for _ in range(num // val[i]):
              roman_num += syms[i]
              num -= val[i]
          i += 1
      return roman_num

  print(int_to_roman(58))
  `;

  const [code, setCode] = useState(defaultCode);
const [showSuggestion, setShowSuggestion] = useState(false);
const [peteAvailable, setPeteAvailable] = useState(true);
const typingTimer = useRef<NodeJS.Timeout | null>(null);

const [showStatusPopup, setShowStatusPopup] = useState(false);
  
  const [opened, {open, close}] = useDisclosure(false) //Tree Modal NOT REQUIRED
  const [helpOpened, { open: openHelp, close: closeHelp }] = useDisclosure(false);
  const [helpOption, setHelpOption] = useState<string | null>(null);
  const [history, setHistory] = useState([]);
  const [personalCode, setPersonalCode] = useState("# Hello world\nprint('hello world')");
  const backendServer = "localhost";
  const wsRef = useRef<WebSocket | null>(null);
  const id = localStorage.getItem('participant-id') || 'D';
  const storedUserId = id.replace(/"/g, '');
  const [collabData, setCollabData] = useState([]);
  const [isCollabModalOpen, setCollabModalOpen] = useState(false);
  const [context, setContext] = useState("");
  const[istaskopen,settaskmodalopen]=useState(false);
  function handleCollabModalOpen() {
    setCollabModalOpen(true);
  }
  function handleCollabModalClose() {
    setCollabModalOpen(false);
  }

  useEffect(() => {
    const handler = () => {
      setPeteAvailable(prev => !prev); // toggle state
      setShowStatusPopup(true);
    };

    window.addEventListener("pete-click", handler);

    return () => {
      window.removeEventListener("pete-click", handler);
    };
  }, []);
  
  const [personalEditorExtensions, setPersonalEditorExtensions] = useState<Extension[]>(() => [python()]);
    const [isSessionStartedModalOpen, setIsSessionStartedModalOpen] = useState(false);
    const [sessionDetails, setSessionDetails] = useState({
    totalDurationSeconds: 150,
    taskContext: '',
    helperName: ''
  });
  const [taskSuggestionOptions, setTaskSuggestionOptions] = useState<[]>([]);
  const openTModal = () => settaskmodalopen(true);
  const closeTModal = () => settaskmodalopen(false);
  function extractJsons(text: string): object[] {
    const jsonMatches = [...text.matchAll(/```json\n(.*?)\n```/gs)];
    return jsonMatches.map(match => {
      try {
        return JSON.parse(match[1].trim());
      } catch (error) {
        console.error("Failed to parse JSON:", match[1]);
        return null;
      }
    }).filter(json => json !== null);
  }
  const handleCloseSessionStartedModal = () => {
    setIsSessionStartedModalOpen(false);
  };

  const handleChange = (value: string | undefined) => {
    setCode(value || "");

    if (typingTimer.current) {
      clearTimeout(typingTimer.current);
    }

    typingTimer.current = setTimeout(() => {
      setShowSuggestion(true);
    }, 2000); // 2 seconds after typing
  };

  useEffect(() => {
  if (storedUserId && !wsRef.current) {
    console.log(`Raw value from localStorage: "${storedUserId}"`);    
      const wsUrl = `ws://${backendServer}:8000/ws/${storedUserId}`;
      console.log("WebSocket URL:", wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connection established");
        let payload={
          cursor: 0,
          doc: ytext.toString(),
          name: storedUserId,
          timeStamp: new Date().getTime(),
        }
        console.log("Sending initial payload:", payload);
        ws.send(JSON.stringify({event:'updateMaster',payload:payload}));

        console.log("Configuring personal editor WebSocket extension for user:", storedUserId);
        const playgroundUpdateExtension = createPersonalEditorUpdateExtension(ws, storedUserId);
        setPersonalEditorExtensions([python(), playgroundUpdateExtension]);

    };
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("Received message:", data);
        if (data['event'] === 'run') {
          console.log( data);
          appendToHistory(data['stdout'], data['all']);
        }
        if (data['event'] === 'initial') {
          ytext.insert(0, data['payload']['doc']);
        }
        if(data['event']=='notification'){
          const context=data['payload']['context']
          const graphData=data['payload']['suggestions']
          console.log("Graph data:", graphData);
          setContext(context);
          setCollabData(graphData);
          handleCollabModalOpen();

        }
        if(data['event']=='StartHelpSession'){
          if(data['payload']['helper']===storedUserId|| data['payload']['helpee']===storedUserId){
            const totalDurationSeconds=data['payload']['time']
            const taskContext= data['payload']['hint']+" please go over to their screen and help them. " 
            const helperName=data['payload']['heper']
            setSessionDetails({ totalDurationSeconds, taskContext, helperName });
            setIsSessionStartedModalOpen(true);
          }
        }
        if(data['event']==='Suggestion'){
          const taskSuggestions = data['payload']['options'];
          console.log("Task suggestions:", taskSuggestions);
          setTaskSuggestionOptions(taskSuggestions['options']);
        }
    }   
      ws.onclose = (event) => { 
          console.log(`WebSocket connection closed: Code=${event.code}, Reason=${event.reason}, WasClean=${event.wasClean}`);
      };

      ws.onerror = (error) => {
          console.error("WebSocket specific error event:", error);
      };

  }
}, []); 

  function clearCode() {
    setHistory([]);

    console.log("Cleared code");
  }

  async function testCodePlayground() {
    const code = personalCode
    const channel = storedUserId;
    
  
    // const [iconClass, setIconClass] = useState("fa-solid fa-flask");
// IMPLEMENT SPINNER
    // setIconClass("fa-solid fa-spinner");
  
    await fetch(`http://${backendServer}:8000/testFunction`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code: code, channel: channel }),
    });
  console.log("testing personal code:", code);
  }

  function mergeCollaborativeCode() {
    const code = ytext.toString();
    // Implement your merge logic here
   
    
    console.log("Merging code:", code);
  }
  async function runPersonalCode() {
    const code= personalCode;
    const channel=storedUserId;

    try {
      await fetch(`http://${backendServer}:8000/test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: code,channel: channel})});
          console.log("Running personal code:", code);
    } catch (e) {
      console.error("Execution error:", e);
    }
  }  
  function appendToHistory(output, all) {
    setHistory((prev) => [...prev, [new Date(), output, all]]);
  }

  function handleHelpSubmit() {
    console.log("Help requested with option:", helpOption);
    // Add logic here: send request to backend, notify teammates, etc.
    // Example: sendWebSocketMessage({ event: 'requestHelp', option: helpOption, userId: storedUserId });
    setHelpOption(null); // Reset selection
    closeHelp(); // Close the modal
}


const helpMe = () => {
  openHelp();
  fetch(`http://${backendServer}:8000/helpMe`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id: id, choice: "Help", text: "" }),
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  })
  .then(data => {
    console.log('Help request successful:', data);
  })
  .catch(error => {
    console.error('There was a problem with the help request:', error);
  });
};

const editorRef = useRef<EditorView | null>(null);



  return (
    <>
      <Container fluid h={"90vh" } p={0}>
          <PanelGroup direction="vertical">
      
          <Panel defaultSize={50} minSize={20}>
          <PanelGroup direction="horizontal">
              {/* --- Original Team Editor Panel --- */}
              <Panel defaultSize={50} minSize={20}> {/* Adjust defaultSize as needed */}
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <Group justify="space-between" p="xs" style={{ borderBottom: '1px solid #ccc' }}>
                    <Title order={3}>Team Editor</Title>
                    <Group>
                      <Button size='compact-xs'>Test</Button>
                    </Group>
                  </Group>
                  <div style={{ flexGrow: 1, overflow: 'auto', position: 'relative' }}> {/* Allow CodeMirror to take remaining space */}
                     <CodeMirror
                       height="100%" 
                       value={code}
                       extensions={[python(),yCollab(ytext,provider.awareness), peteField]} 
                       style={{ height: '100%' }} 
                       onCreateEditor={(view) => {
                        editorRef.current = view;
                      }}
                       onChange={(value) => {
                          if (typingTimer.current) {
                            clearTimeout(typingTimer.current);
                          }

                          typingTimer.current = setTimeout(() => {
                            if (!editorRef.current) return;

                            const pos = editorRef.current.state.selection.main.head;

                            editorRef.current.dispatch({
                              effects: addPeteEffect.of(pos)
                            });
                          }, 2000);
                        }}
                     />

                     {showStatusPopup && (
                      <div
                        style={{
                          position: "absolute",
                          top: "100px",
                          right: "40px",
                          background: "white",
                          padding: "16px",
                          borderRadius: "10px",
                          width: "220px",
                          boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
                          zIndex: 9999
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
                          <span style={{ fontSize: "24px", marginRight: "10px" }}>👨‍💻</span>
                          <div>
                            <div><b>Pete</b></div>
                            <div style={{ color: peteAvailable ? "green" : "red" }}>
                              {peteAvailable ? "● Available" : "● Deep Work"}
                            </div>
                          </div>
                        </div>

                        {/* <button
                          style={{
                            width: "100%",
                            padding: "6px",
                            background: peteAvailable ? "#4CAF50" : "#777",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            marginBottom: "8px",
                            cursor: "pointer"
                          }}
                        >
                          {peteAvailable ? "Help Me" : "Help Me When Free"}
                        </button> */}

                        <button
                          style={{
                            width: "100%",
                            padding: "6px",
                            background: peteAvailable ? "#4CAF50" : "#ff9800",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            marginBottom: "8px",
                            cursor: "pointer"
                          }}
                          onClick={() => {
                            const widget = document.getElementById("pete-inline-widget");

                            if (widget) {
                              if (peteAvailable) {
                                widget.style.background = "#2e7d32"; // green
                                widget.innerHTML = "👨‍💻 Pete is on the way";
                              } else {
                                widget.style.background = "#ff9800"; // orange
                                widget.innerHTML = "👨‍💻 Pete will ping when free";
                              }
                            }

                            setShowStatusPopup(false);
                          }}
                        >
                          {peteAvailable ? "Help Me" : "Help Me When Free"}
                        </button>

                        <button
                          style={{
                            width: "100%",
                            padding: "6px",
                            background: "#eee",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer"
                          }}
                          onClick={() => {
                            const widget = document.getElementById("pete-inline-widget");
                            
                            if (widget) {
                              widget.style.background = "#2d2d2d"
                              widget.innerHTML =  "👨‍💻 Pete can help with <b>loop logic</b>"
                            }

                            setShowStatusPopup(false)
                          }}
                        >
                          Close
                        </button>
                      </div>
                    )}






                     {showSuggestion && (
                        <div style={{
                          position: "absolute",
                          bottom: "120px",
                          right: "60px",
                          background: "#1e1e1e",
                          color: "white",
                          padding: "8px 12px",
                          borderRadius: "8px",
                          fontSize: "14px",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                          cursor: "pointer"
                        }}>
                          <span
                            onClick={() => {
                              setPeteAvailable(prev => !prev);
                              setShowStatusPopup(true);
                            }}
                            style={{ marginRight: "8px", fontSize: "18px" }}
                          >
                            👨‍💻
                          </span>
                          Pete can help with <b>loop logic and numeral mapping</b>
                        </div>
                      )}
                      {/* {showStatusPopup && (
                        <div style={{
                          position: "absolute",
                          bottom: "180px",
                          right: "60px",
                          background: "white",
                          color: "black",
                          padding: "16px",
                          borderRadius: "10px",
                          width: "220px",
                          boxShadow: "0 6px 16px rgba(0,0,0,0.25)"
                        }}>
                          <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
                            <span style={{ fontSize: "24px", marginRight: "10px" }}>👨‍💻</span>
                            <div>
                              <div><b>Pete</b></div>
                              <div style={{ color: peteAvailable ? "green" : "red" }}>
                                {peteAvailable ? "● Available" : "● Deep Work"}
                              </div>
                            </div>
                          </div>

                          <button style={{
                            width: "100%",
                            padding: "6px",
                            background: peteAvailable ? "#4CAF50" : "#888",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            marginBottom: "6px"
                          }}>
                            {peteAvailable ? "Help Me" : "Help Me When Free"}
                          </button>

                          <button
                            style={{
                              width: "100%",
                              padding: "6px",
                              background: "#eee",
                              border: "none",
                              borderRadius: "6px"
                            }}
                            onClick={() => setShowStatusPopup(false)}
                          >
                            Close
                          </button>
                        </div>
                      )} */}
                  </div>
                </div>
              </Panel>
              {/* NEW: Resize Handle */}
              <PanelResizeHandle className={styles.ResizeHandleOuter}>
                 <div className={styles.ResizeHandleInner} style={{backgroundColor: '#eee', height: '5px'}}></div> {/* Basic styling */}
              </PanelResizeHandle>
                   <Panel defaultSize={50} minSize={20}>
                  {/* Flex container to manage layout */}
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    {/* Button Group - should not grow or shrink */}
                    <Group justify="space-between" p="xs" style={{ borderBottom: '1px solid #ccc', flexShrink: 0 }}>
                      <Title order={3}>Personal Editor</Title>
                      <Group>
                        <Button onClick={testCodePlayground} size='compact-xs'>Test</Button>
                        <Button onClick={runPersonalCode} size='compact-xs'>Run</Button>
                        <Button onClick={clearCode} size='compact-xs'>Clear</Button>
                        <Button onClick={helpMe} size='compact-xs'>Flag for Help</Button>
                      </Group>
                    </Group>
                    {/* CodeMirror Container - should grow and scroll */}
                    <div style={{ flexGrow: 1, overflow: 'auto', minHeight: 0 }}> {/* Added minHeight: 0 */}
                      <CodeMirror
                        height="100%" // Changed from 500px to 100%
                        value={personalCode}
                        onChange={(value) => setPersonalCode(value)}
                        extensions={personalEditorExtensions}
                        style={{ height: '100%' }} // Ensure CM fills its container
                      />
                    </div>
                  </div>
                </Panel>
              </PanelGroup>
            </Panel>
        <PanelResizeHandle />

              {/* NEW: Panel below Team Editor */}
              <Panel defaultSize={50} minSize={20}>
              <PanelGroup direction="horizontal">
       <Panel defaultSize={50}>
       <div style={{ padding: '10px' }}>
          <ReactFlowProvider>

<GraphComponent />
</ReactFlowProvider>
          </div>
       </Panel>
       <PanelResizeHandle />
        <Panel defaultSize={50}>
        <div className={styles.Output} id="output">
        <Title order={3}>Output</Title>
        <div style={{ overflowY: 'auto', maxHeight: '350px' }}>
          {history.map(([timestamp, output, isCollaborative], i) => {
            const HOURS = timestamp.getHours().toString().padStart(2, '0');
            const MINUTES = timestamp.getMinutes().toString().padStart(2, '0');
            const SECONDS = timestamp.getSeconds().toString().padStart(2, '0');

            return (
              <div key={i}>
                <div className={`outputLine ${i % 2 === 1 ? 'active' : ''}`}>
                  <div style={{ whiteSpace: 'pre-wrap' }}><ReactAnsi logStyle={{backgroundColor: 'white',color:'black', fontSize: '10px'}} log={output}/></div>
                  <p>{`${HOURS}:${MINUTES}:${SECONDS}`}</p>
                </div>
                <div
                  className={`outputLine ${i % 2 === 1 ? 'active' : ''}`}
                  style={{ color: 'yellow' }}
                >
                  <i>{isCollaborative ? 'Ran by Collaborative Editor' : 'Ran from Personal Playground'}</i>
                </div>
              </div>
            );
          })}
        </div>
      </div>
        </Panel>
      </PanelGroup>
      </Panel>
    </PanelGroup>
    </Container>

<Modal size="75%" opened={opened} onClose={close} title="Progress Tree" centered>
  <div style={{ width: "100%", height: 500 }}>
    {/* <Tree /> */}
    <ReactFlowProvider>

    <GraphComponent />
    </ReactFlowProvider>

  </div>
</Modal>
{isCollabModalOpen && (<CollaborativeOpportunityModal onClose={handleCollabModalClose} predictions={collabData} context={context} id={storedUserId} />
)}


      {isSessionStartedModalOpen && (
        <HelpSessionStartedModal
          isOpen={isSessionStartedModalOpen}
          onClose={handleCloseSessionStartedModal}
          totalDurationSeconds={sessionDetails.totalDurationSeconds}
          taskContext={sessionDetails.taskContext}
          helperName={sessionDetails.helperName}
        />
      )}
 <HelpModal
      isOpen={helpOpened}
      id={storedUserId}
      onClose={() => {
          closeHelp();
          setHelpOption(null);
      }}
      >

      </HelpModal>
    </>
  )
}
// Y.js Collaboration Extension
const ydoc = new Y.Doc();
const provider = new WebrtcProvider('prime-collab-room-demo', ydoc, {
  // signaling: ['wss://prime-lab.cs.vt.edu:4444'],
    signaling: ['http://localhost:4444'], //this is for local testing
  peerOpts: {
    config: {
      iceServers: [
        {
          urls: 'stun:stun.relay.metered.ca:80',
        },
        {
          urls: 'turn:global.relay.metered.ca:80',
          username: 'a6cd4590c56d422090feaf27',
          credential: '99XwNU33NXuWP2eZ',
        },
        {
          urls: 'turn:global.relay.metered.ca:80?transport=tcp',
          username: 'a6cd4590c56d422090feaf27',
          credential: '99XwNU33NXuWP2eZ',
        },
        {
          urls: 'turn:global.relay.metered.ca:443',
          username: 'a6cd4590c56d422090feaf27',
          credential: '99XwNU33NXuWP2eZ',
        },
        {
          urls: 'turns:global.relay.metered.ca:443?transport=tcp',
          username: 'a6cd4590c56d422090feaf27',
          credential: '99XwNU33NXuWP2eZ',
        },
      ],
    },
  },
});
const ytext = ydoc.getText('codemirror');

const userColors = [
  { color: '#30bced', light: '#30bced33' },
  { color: '#6eeb83', light: '#6eeb8333' },
  { color: '#ffbc42', light: '#ffbc4233' },
  { color: '#ecd444', light: '#ecd44433' },
  { color: '#ee6352', light: '#ee635233' },
  { color: '#9ac2c9', light: '#9ac2c933' },
  { color: '#8acb88', light: '#8acb8833' },
  { color: '#1be7ff', light: '#1be7ff33' },
];

const color = userColors[Math.floor(Math.random() * 8) % userColors.length];

provider.awareness.setLocalStateField('user', {
  name: localStorage.getItem('participant-id'),
  color: color.color,
  colorLight: color.light,
});

