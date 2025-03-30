import { basicSetup } from 'codemirror';
import { EditorView } from '@codemirror/view';
import { indentUnit, syntaxTree } from '@codemirror/language';
import { keymap } from '@codemirror/view';
import { indentWithTab } from '@codemirror/commands';
import { python } from '@codemirror/lang-python';
import { oneDark } from '@codemirror/theme-one-dark';
import './assets/styles.css';

import * as Y from 'yjs';
import { yCollab } from 'y-codemirror.next';
import { YText } from 'yjs/dist/src/internals';

import { generateId } from 'zoo-ids';
import { WebrtcProvider } from 'y-webrtc';

import { extension } from './extension';

const id = Math.floor(Math.random() * 1e9).toString(36);
const animalId = generateId(id, { numAdjectives: 1, caseStyle: 'titlecase' });
localStorage.setItem('id', animalId);

// TODO: update for wss
// const ws = new WebSocket(`wss://prime-lab.cs.vt.edu:8000/ws/${animalId}`);

const backendServer = '127.0.0.1';
// prime-lab.cs.vt.edu
const ws = new WebSocket(`wss://${backendServer}:8000/ws/${animalId}`);

document.querySelector<HTMLSpanElement>('#id')!.innerText += animalId;

ws.addEventListener('open', (_) => {
  console.log('socket opened');

  let payload = {
    cursor: mainView.state.selection.main.head,
    doc: ytext.toString(),
    name: animalId,
    timeStamp: Date.now(),
  };

  ws.send(JSON.stringify({ event: 'updateMaster', payload: payload }));
});

ws.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  if (data['event'] === 'run') {
    appendToHistory(data['stdout'], data['all']);
  }
  if (data['event'] === 'initial') {
    ytext.insert(0, data['payload']['doc']);
  }
  if (data['event'] == 'countdown') {
    const minutes = data['payload']['minutes']
    const seconds = data['payload']['seconds']
    minutesElement.innerText = minutes.toString();
    secondsElement.innerText = seconds.toString().padStart(2, '0');
  }
  if (data['event'] === 'countdownFinished') {
    alert("The countdown has finished!");
  }
  if (data['event'] === 'notification') {
    document
      .querySelector<HTMLSpanElement>('#notification')!
      .classList.add('active');
    document.querySelector<HTMLSpanElement>('#content')!.innerText =
      data['payload']['prompt'];
    const options = document.querySelector<HTMLSpanElement>('#options')!;
    options.innerHTML = '';

    for (let option of data['payload']['options']) {
      const label = document.createElement('label');
      label.textContent = option;
      const opt = document.createElement('input');
      opt.type = 'radio';
      opt.id = option;
      opt.name = 'option[]';
      label.prepend(opt);
      options.append(label);
      const br = document.createElement('br');
      options.append(br);
    }
  }
});


const minutesElement = document.getElementById('minutes') as HTMLSpanElement;
const secondsElement = document.getElementById('seconds') as HTMLSpanElement;



export function updateGraph(nodeId: string) {
  ws.send(JSON.stringify({ event: 'graphUpdated', payload: { node: nodeId } }));
}

export const userColors = [
  { color: '#30bced', light: '#30bced33' },
  { color: '#6eeb83', light: '#6eeb8333' },
  { color: '#ffbc42', light: '#ffbc4233' },
  { color: '#ecd444', light: '#ecd44433' },
  { color: '#ee6352', light: '#ee635233' },
  { color: '#9ac2c9', light: '#9ac2c933' },
  { color: '#8acb88', light: '#8acb8833' },
  { color: '#1be7ff', light: '#1be7ff33' },
];

export const color =
  userColors[Math.floor(Math.random() * 8) % userColors.length];

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
const undoManager = new Y.UndoManager(ytext);

provider.awareness.setLocalStateField('user', {
  name: animalId,
  color: color.color,
  colorLight: color.light,
});

ydoc.on('update', (_) => {
  console.log('cursor-location', mainView.state.selection.main.head);
  console.log('user-id', provider.awareness.getLocalState().user.name);

  let payload = {
    cursor: mainView.state.selection.main.head,
    doc: ytext.toString(),
    name: provider.awareness.getLocalState().user.name,
    timeStamp: Date.now(),
  };

  if (ws.readyState == ws.OPEN) {
    ws.send(JSON.stringify({ event: 'updateMaster', payload: payload }));
  }
});

let mainView = new EditorView({
  doc: ytext.toString(),
  extensions: [
    basicSetup,
    python(),
    keymap.of([indentWithTab]),
    oneDark,
    yCollab(ytext, provider.awareness, { undoManager }),
    indentUnit.of('    '),
  ],
  parent: document.querySelector<HTMLDivElement>('#editor')!,
});

let secondaryView = new EditorView({
  doc: `# Personal Playground\n# Code will not be shared with others\nfrom study_problem_classes import Menu, Order, Customer, Restaurant\n\nprint('hello playground')`,
  extensions: [
    basicSetup,
    python(),
    extension(ws),
    keymap.of([indentWithTab]),
    oneDark,
    indentUnit.of('    '),
  ],
  parent: document.querySelector<HTMLDivElement>('#secondary')!,
});

/*
+------------------+
|                  |
| HTML Interaction |
|                  |
+------------------+
*/

document.querySelector('#run-collab')!.addEventListener('click', runCodeCollab);
document
  .querySelector('#run-playground')!
  .addEventListener('click', runCodePlayground);
document
  .querySelector('#test-collab')!
  .addEventListener('click', testCodeCollab);
document
  .querySelector('#test-playground')!
  .addEventListener('click', testCodePlayground);
document.querySelector('#clear')!.addEventListener('click', clearCode);
document.querySelector('#helpMe')!.addEventListener('click', helpMe);
document.querySelector('#accept')!.addEventListener('click', acceptNotif);
document.querySelector('#handle')!.addEventListener('mousedown', handle_resize);

/*
+------------------+
|                  |
| Editor Functions |
|                  |
+------------------+
*/
let history: [Date, string, boolean][] = [];

async function runCodeCollab() {
  const channel = 'all';
  const code = ytext;

  await fetch(`https://${backendServer}:8000/test`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code: code, channel: channel }),
  });
}

async function runCodePlayground() {
  const code = secondaryView.state.doc.toString();
  const channel = animalId;

  await fetch(`https://${backendServer}:8000/test`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code: code, channel: channel }),
  });
}

async function testCodeCollab() {
  const code = ytext;
  const channel = 'all';

  await fetch(`https://${backendServer}:8000/testFunction`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code: code, channel: channel }),
  });
}

async function testCodePlayground() {
  const code = secondaryView.state.doc.toString();
  const channel = animalId;

  const icon = document.querySelector("#test-playground-icon")
  icon.className = "fa-solid fa-spinner"

  await fetch(`https://${backendServer}:8000/testFunction`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code: code, channel: channel }),
  });

  icon.className = "fa-solid fa-flask"
}

function appendToHistory(output: string, all: boolean) {
  history.push([new Date(), output, all]);

  const outputDiv = document.querySelector<HTMLDivElement>('#output')!;
  outputDiv.innerHTML = '';

  for (let i = 0; i < history.length; i++) {
    let command = history[i];
    console.log(command)

    const HOURS = command[0].getHours().toString().padStart(2, '0');
    const MINUTES = command[0].getMinutes().toString().padStart(2, '0');
    const SECONDS = command[0].getSeconds().toString().padStart(2, '0');

    const node = document.createElement('div');
    node.className = 'outputLine';
    node.innerHTML = `
      <p>${command[1]}</p>
      <p>${HOURS}:${MINUTES}:${SECONDS}</p>
    `;

    const authored = document.createElement('span');
    authored.className = 'outputLine';
    authored.innerHTML = `<p></p>${command[2]
        ? '<i>Ran by Collaborative Editor</i>'
        : '<i>Ran from Personal Playground</i>'
      }`;
    authored.style.color = 'yellow';

    if (i % 2 === 1) {
      node.className += ' active';
      authored.className += ' active';
    }

    outputDiv!.appendChild(node);
    outputDiv!.appendChild(authored);
  }

  outputDiv.scrollTop = outputDiv.scrollHeight - outputDiv.clientHeight;
}

function clearCode() {
  const outputDiv = document.querySelector<HTMLDivElement>('#output')!;
  outputDiv.innerHTML = '';
  history = [];
}

function helpMe() {
  fetch(`https://${backendServer}:8000/helpNotification`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id: animalId, choice: "Help", text: secondaryView.state.doc.toString() }),
  });
}


function acceptNotif() {

  document
    .querySelector<HTMLSpanElement>('#notification')!
    .classList.remove('active');
}

let m_pos: number = 0;
function resize(e) {
  const dx = e.y - m_pos;
  m_pos = e.y;
  const editors: HTMLElement[] = Array.from(
    document.getElementsByClassName('editor') as HTMLCollectionOf<HTMLElement>
  );
  const split = document.getElementById('split');
  const maxHeight = parseInt(getComputedStyle(split, '').maxHeight);
  let newHeight = parseInt(getComputedStyle(split, '').height) - dx;

  if (newHeight < maxHeight) {
    for (let i in editors) {
      editors[i].style.height =
        parseInt(getComputedStyle(editors[i], '').height) + dx + 'px';
    }
    split.style.height =
      parseInt(getComputedStyle(split, '').height) - dx + 'px';
  }
}

function handle_resize(e) {
  if (e.offsetY < 4) {
    m_pos = e.x;
    document.addEventListener('mousemove', resize, false);
  }
}

document.addEventListener(
  'mouseup',
  function () {
    document.removeEventListener('mousemove', resize, false);
  },
  false
);

// moved to smm.js for interaction with d3 graphs
//
// const sliderEl = document.querySelector<HTMLInputElement>("#rangeSlider")
// const sliderValue = document.querySelector<HTMLDivElement>("#rangeValue")
// const spanValue = document.querySelector<HTMLSpanElement>("#timeSpent")
//
// if (sliderEl) {
//   sliderEl.addEventListener("input", (event: Event ) => {
//     const tempSliderValue = event.target as HTMLInputElement;
//     sliderValue.textContent = `${tempSliderValue.value} minutes`;
//     spanValue.textContent = sliderValue.textContent
//
//     const progress = (parseInt(tempSliderValue.value) / parseInt(sliderEl.max)) * 100
//
//     sliderEl.style.background = `linear-gradient(to right, lightblue ${progress}%, #ccc ${progress}%)`;
//
//     const left = (((+sliderEl.value - +sliderEl.min) / (+sliderEl.max - +sliderEl.min)) * ((sliderValue.clientWidth - 8) - 8)) + 4;
//     sliderValue.style.left = `calc(${left}px - 30px)`;
//
//   })
// }
//


export function jumpToFunction(functionName: string) {
  const tree = syntaxTree(mainView.state);

  tree.iterate({
    enter: (node) => {
      if (node.name === 'FunctionDefinition') {
        const nameNode = node.node.getChild('VariableName');
        if (
          nameNode &&
          mainView.state.doc.sliceString(nameNode.from, nameNode.to) ===
          functionName
        ) {

          let from = node.node.from;
          let to = node.node.to;
          // Move the cursor to the function's start position
          mainView.dispatch({
            effects: EditorView.scrollIntoView(node.from, { y: 'start' }),
          });
        }
      }
    },
  });
}
