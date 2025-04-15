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

export default function Editor() {
  const [opened, {open, close}] = useDisclosure(false)

  return (
    <>
      <Container fluid h={700}>
        <PanelGroup direction="horizontal">
          <Panel defaultSize={30} collapsible={true} collapsedSize={1} minSize={20}>
            <div style={{ overflow: 'auto' }}>
              <Group  align='center'>
                <Title order={3}>Team Editor</Title>
                <Group>
                  <Button size='compact-xs'>Test</Button>
                </Group>
              </Group>
              <CodeMirror height="700px"
                extensions={[python(),
                yCollab(ytext, provider.awareness),
              ]} />
            </div>
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
                    <Button size='compact-xs'>Test</Button>
                    <Button size='compact-xs'>Merge</Button>
                  </Group>
                </Group>
                <CodeMirror height="500px" value={"# Hello world\nprint('hello world')"} extensions={[python()]} />
              </Panel>
              <PanelResizeHandle />
              <Panel minSize={30}>
                <div className={styles.Output}>
                  <Title order={3}>Output</Title>
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
          <Tree />
        </div>
      </Modal>
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

