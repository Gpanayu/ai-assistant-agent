import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels"
import { Button, Title, Container, Affix, Group, Modal } from "@mantine/core"
import { useDisclosure } from '@mantine/hooks';
import styles from "./Editor.module.css"
import { yCollab } from 'y-codemirror.next';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import Tree from './Tree'
import { channel } from 'diagnostics_channel';
import HelpModal from './modals/HelpModal';
import { useEffect, useState,useRef } from 'react';
import { cursorTo } from 'readline';
import { timeStamp } from 'console';
import CollaborativeOpportunityModal from './modals/CollabModal';
import GraphComponent from './SMM';
import { ReactFlowProvider } from '@xyflow/react';
export default function Editor() {

  const [opened, {open, close}] = useDisclosure(false)
  const [helpOpened, { open: openHelp, close: closeHelp }] = useDisclosure(false);
  const [helpOption, setHelpOption] = useState<string | null>(null);
  const [history, setHistory] = useState([]);
  const [personalCode, setPersonalCode] = useState("# Hello world\nprint('hello world')");
  const backendServer = "0.0.0.0";
  const wsRef = useRef<WebSocket | null>(null);
  const id = localStorage.getItem('participant-id') || 'D';
  const storedUserId = id.replace(/"/g, '');

  useEffect(() => {
  if (storedUserId && !wsRef.current) {
    console.log(`Raw value from localStorage: "${storedUserId}"`);    
      const wsUrl = `wss://${backendServer}:8000/ws/${storedUserId}`;
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
  
    await fetch(`https://${backendServer}:8000/testFunction`, {
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
      await fetch(`https://${backendServer}:8000/test`, {
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


  return (
    <>
      <Container fluid h={700}>
        <PanelGroup direction="horizontal">
      
          <Panel defaultSize={30} collapsible={true} collapsedSize={1} minSize={20}>
          <PanelGroup direction="vertical">
              {/* --- Original Team Editor Panel --- */}
              <Panel defaultSize={70} minSize={20}> {/* Adjust defaultSize as needed */}
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <Group justify="space-between" p="xs" style={{ borderBottom: '1px solid #ccc' }}>
                    <Title order={3}>Team Editor</Title>
                    <Group>
                      <Button size='compact-xs'>Test</Button>
                    </Group>
                  </Group>
                  <div style={{ flexGrow: 1, overflow: 'auto' }}> {/* Allow CodeMirror to take remaining space */}
                     <CodeMirror
                       height="100%" 
                       extensions={[python(),yCollab(ytext,provider.awareness)]} 
                       style={{ height: '100%' }} 
                     />
                  </div>
                </div>
              </Panel>
              {/* NEW: Resize Handle */}
              <PanelResizeHandle className={styles.ResizeHandleOuter}>
                 <div className={styles.ResizeHandleInner} style={{backgroundColor: '#eee', height: '5px'}}></div> {/* Basic styling */}
              </PanelResizeHandle>
              {/* NEW: Panel below Team Editor */}
              <Panel minSize={20}>
                <div style={{ padding: '10px' }}>
                <ReactFlowProvider>

<GraphComponent />
</ReactFlowProvider>
                </div>
              </Panel>
            </PanelGroup>

          </Panel>
          <PanelResizeHandle className={styles.ResizeHandleOuter}>
            <div className={styles.ResizeHandleInner}></div>
          </PanelResizeHandle>
         

          <Panel minSize={1}>
            <PanelGroup direction='vertical'>
              <Panel defaultSize={110} collapsible={true} minSize={20}>
                <Group align='center'>
                  <Title order={3}>Personal Editor</Title>
                  <Group>
                    <Button onClick={testCodePlayground} size='compact-xs'>Test</Button>
                    <Button onClick={runPersonalCode} size='compact-xs'>Run</Button>
                    <Button onClick={clearCode} size='compact-xs'>Clear</Button>
                    <Button size='compact-xs'>Merge</Button>
                    <Button onClick={openHelp} size='compact-xs'>Flag for Help</Button>

                  </Group>
                </Group>
                <CodeMirror 
                    height="500px" 
                    value={personalCode}
                    onChange={(value) => setPersonalCode(value)}
                    extensions={[python()]} />
              </Panel>
              <PanelResizeHandle />
              <Panel minSize={30}>
              <div className={styles.Output} id="output">
              <Title order={3}>Output</Title>
              <div style={{ overflowY: 'auto', maxHeight: '300px' }}>
                {history.map(([timestamp, output, isCollaborative], i) => {
                  const HOURS = timestamp.getHours().toString().padStart(2, '0');
                  const MINUTES = timestamp.getMinutes().toString().padStart(2, '0');
                  const SECONDS = timestamp.getSeconds().toString().padStart(2, '0');

                  return (
                    <div key={i}>
                      <div className={`outputLine ${i % 2 === 1 ? 'active' : ''}`}>
                        <p>{output}</p>
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
      <Affix position={{ bottom: 20, right: 20 }}>
        <Button onClick={open}>
          Progress Tree
        </Button>
      </Affix>

      <Modal size="75%" opened={opened} onClose={close} title="Progress Tree" centered>
        <div style={{ width: "100%", height: 500 }}>
          {/* <Tree /> */}
          <ReactFlowProvider>

          <GraphComponent />
          </ReactFlowProvider>

        </div>
      </Modal>
       <HelpModal
            isOpen={helpOpened}
            onClose={() => {
                closeHelp();
                setHelpOption(null); // Reset on close
            }}
            >

            </HelpModal>
    </>
  )
}

// Y.js Collaboration Extension

const ydoc = new Y.Doc();
const provider = new WebrtcProvider('prime-collab-room-demo', ydoc, {
  signaling: ['wss://prime-lab.cs.vt.edu:4444'],
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

