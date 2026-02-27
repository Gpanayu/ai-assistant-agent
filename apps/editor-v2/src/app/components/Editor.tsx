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
import HelpModal from './modals/HelpModal';
import { useEffect, useState, useRef } from 'react';
import GraphComponent from './SMM';
import { Background, ReactFlowProvider } from '@xyflow/react';
import CollaborativeOpportunityModal from './modals/CollabModal';
import { Extension, StateField, EditorState, RangeSetBuilder } from "@codemirror/state";
import { EditorView, Decoration, WidgetType, GutterMarker, gutter } from "@codemirror/view";
import { createPersonalEditorUpdateExtension } from './modals/extension';
import HelpSessionStartedModal from './modals/HelpSessionModal';

const REFERENCE_HIGHLIGHT_LINES = [2, 3, 5, 6, 7, 8, 9];
const TOM_ASSIST_ANCHOR = "    # TODO Tom: update order.cost using menu.dishes[item]";
const HELPER_ASSIST_ANCHOR = "    # TODO Tom: update order.cost using menu.dishes[item]";

class PeerAssistWidget extends WidgetType {
  constructor(private readonly text: string) {
    super();
  }

  toDOM() {
    const span = document.createElement("span");
    span.style.marginLeft = "8px";
    span.style.padding = "2px 8px";
    span.style.borderRadius = "999px";
    span.style.background = "#16a34a";
    span.style.border = "1px solid #15803d";
    span.style.color = "#ffffff";
    span.style.fontSize = "11px";
    span.style.fontWeight = "700";
    span.style.lineHeight = "1.2";
    span.style.boxShadow = "0 1px 2px rgba(0, 0, 0, 0.2)";
    span.textContent = this.text;
    return span;
  }

  ignoreEvent() {
    return true;
  }
}

function buildReferenceDecorations(state: EditorState) {
  const decorations = [];
  for (const lineNo of REFERENCE_HIGHLIGHT_LINES) {
    if (lineNo > state.doc.lines) continue;
    const line = state.doc.line(lineNo);
    decorations.push(
      Decoration.line({ class: "cm-reference-highlight" }).range(line.from)
    );
  }
  return Decoration.set(decorations);
}

const referenceHighlightField = StateField.define({
  create(state) {
    return buildReferenceDecorations(state);
  },
  update(decorations, tr) {
    if (!tr.docChanged) return decorations;
    return buildReferenceDecorations(tr.state);
  },
  provide: (f) => EditorView.decorations.from(f),
});

const referenceHighlightTheme = EditorView.theme({
  ".cm-line.cm-reference-highlight": {
    backgroundColor: "#fff7d6",
  },
});

function buildAssistDecoration(state: EditorState, message: string, anchorText: string) {
  const anchor = state.doc.toString().indexOf(anchorText);
  if (anchor < 0) return Decoration.none;
  const anchorEnd = anchor + anchorText.length;
  return Decoration.set([
    Decoration.widget({
      widget: new PeerAssistWidget(message),
      side: 1,
    }).range(anchorEnd),
  ]);
}

function createAssistField(message: string, anchorText: string) {
  return StateField.define({
    create(state) {
      return buildAssistDecoration(state, message, anchorText);
    },
    update(decorations, tr) {
      if (!tr.docChanged) return decorations.map(tr.changes);
      return buildAssistDecoration(tr.state, message, anchorText);
    },
    provide: (f) => EditorView.decorations.from(f),
  });
}

const tomAssistField = createAssistField(
  "👨‍💻 Pete is here helping now",
  TOM_ASSIST_ANCHOR
);
const helperAssistField = createAssistField(
  "👨‍💻 Pete is here helping now",
  HELPER_ASSIST_ANCHOR
);
const purpleCaretTheme = EditorView.theme({
  ".cm-cursor": {
    display: "block !important",
    borderLeftColor: "#7c3aed",
  },
  "&.cm-focused .cm-cursor": {
    borderLeftColor: "#7c3aed",
  },
  "&.cm-focused .cm-selectionBackground, ::selection": {
    backgroundColor: "#ddd6fe",
  },
});

class RunIconMarker extends GutterMarker {
  toDOM() {
    const span = document.createElement("span");
    span.textContent = "▶";
    span.style.color = "#22c55e";
    span.style.fontSize = "20px";
    span.style.fontWeight = "800";
    span.style.lineHeight = "1";
    span.style.display = "inline-flex";
    span.style.alignItems = "center";
    span.style.justifyContent = "right";
    span.style.width = "16px";
    span.style.cursor = "pointer";
    span.title = "Test function";
    return span;
  }
}

const runIconMarker = new RunIconMarker();

function buildRunIconMarkers(state: EditorState) {
  const builder = new RangeSetBuilder<GutterMarker>();
  for (let lineNo = 1; lineNo <= state.doc.lines; lineNo += 1) {
    const line = state.doc.line(lineNo);
    if (/^\s*def\s+\w+\s*\(/.test(line.text)) {
      builder.add(line.from, line.from, runIconMarker);
    }
  }
  return builder.finish();
}

const runIconField = StateField.define({
  create(state) {
    return buildRunIconMarkers(state);
  },
  update(markers, tr) {
    if (!tr.docChanged) return markers.map(tr.changes);
    return buildRunIconMarkers(tr.state);
  },
});

const runIconGutter = gutter({
  class: "cm-run-icon-gutter",
  markers: (view) => view.state.field(runIconField),
  initialSpacer: () => runIconMarker,
});

const runIconGutterTheme = EditorView.theme({
  ".cm-run-icon-gutter": {
    width: "22px",
  },
});

export default function Editor() {


  const defaultCode = `import random
from typing import List, Tuple, Optional
from study_problem_classes import Menu, Order, Customer, Restaurant


def view_menu(menu: Menu):
    """
    Display the menu items with their cost in the following format:

    item | cost
    chicken | 12.0

    The first line is a header followed by each item and its corresponding cost on a new line.
    Hint: Use .items()
    """
    pass


def create_order(customer: Customer) -> int:
    """
    Create a new order to the customer dictionary.

    The order will have a 4-digit unique id, an empty list of items, and a cost of 0.

    Note: Check if the uuid is not already in customer.order, if it is pick a new uuid
    """
    pass


def clear_order(customer: Customer, order_id: int):
    """
    Clear the order (look up the id) from the customer by removing all items and reset the
    cost to zero.

    After clearing, prints:
        Order cleared.

    Args:
        order_id: The order to be cleared.
    """
    pass


def view_order_summary(order: Order, menu: Menu):
    """
    Print a summary of the given order including each item with its cost and the total cost.

    Expected output format:
        Order Summary:
        chicken - $12.00
        pork - $10.00
        Total: $22.00

    Hint: Use format(x, ".2f") to format to the second decimal

    Args:
        order (Order): The order to summarize.
    """
    pass


def add_to_order(customer: Customer, order_id: int, menu: Menu, item: str):
    """
    Add an item to the order if it exists on the menu and is in the customer's
    order dictionary, update the total cost.

    Args:
        order_id (int): The order to update.
        item (str): The item to add.

    Returns:
        str: The name of the item if added successfully.

    Prints:
        "Added [item]: [cost]" if the item is on the menu.
        "Not on menu" if the item is not available.
        "No order found" if the order_id is not found.
    """
    pass


def remove_from_order(customer: Customer, order_id: int, menu: Menu, item: str) -> bool:
    """
    Remove an item from the customer's order if it exists in the customer's
    order dictionary, update the total cost.

    Args:
        order (Order): The order from which the item should be removed.
        item (str): The item to remove.

    Returns:
        bool: True if the item was removed; False if the item was not found in the order.

    Prints:
        "Removed [item]" if the removal is successful.
        "Not ordered" if the item is not in the order.
        "No order found" if the order_id is not found.
    """
    pass


def calculate_order_cost(order: Order, menu: Menu):
    """
    Calculate the total cost of the order based on the items ordered.

    Args:
        order (Order): The order for which the cost is calculated.

    Returns:
        float: The total cost computed from the menu prices.
    """
    pass


def get_receipt(customer: Customer, menu: Menu):
    """
    Print all orders from the customer's order dictionary:

        [Customer name]:
        -----
        [Order Id]
        Order Summary:
        [item ordered] - $[cost of item]
        [item ordered] - $[cost of item]
        Total: $[total cost of order]
        -----
        [Order Id]
        Order Summary:
        [item ordered] - $[cost of item]
        [item ordered] - $[cost of item]
        Total: $[total cost of order]
        -----
        $[total cost of all orders]

    The output must exactly follow this format.

    Args:
        customer (Customer): The customer orders to generate the receipt.
        menu (Menu): The menu of the restaurant.
    """
    pass


def add_to_queue(restaurant: Restaurant, customer: Customer):
    """
    Add an incoming customer orders (from the customer order dictionary)
    to the restaurant's order queue.

    Args:
        customer (Customer): The customer whose order is to be added.
    """
    pass


def cook_order(restaurant: Restaurant) -> Tuple[str, int]:
    """
    Process the latest order in the queue if there is sufficient inventory.

    For each item in the order, if available in inventory, the inventory is decremented
    and the item's cooking time is added to the total time.

    Returns:
        tuple: A tuple containing the order id and the total cooking time in minutes.
        If the queue is empty or the inventory runs out return (-1, 0)
    """
    pass


def restock_inventory(restaurant: Restaurant, item: str, amount: int):
    """
    Restock the inventory with a given amount for a specified item.

    Args:
        item (str): The item to restock.
        amount (int): The number of units to add.

    Prints:
        "Restocked [item]. New quantity: [quantity]" if the item exists.
        "[item] not found in inventory." if the item is not in the inventory.
    """
    pass


def cook_time_helper(restaurant: Restaurant, item: str):
    """
    Retrieve the cooking time for a specific item.

    Args:
        item (str): The name of the item.

    Returns:
        int: The cooking time in minutes for the item or -1 if not found.
    """
    pass


def inventory_helper(restaurant: Restaurant, item: str):
    """
    Check if the item is available in inventory and decrement its quantity by one if available.

    Args:
        item (str): The item to check.

    Returns:
        bool: True if the item was available and decremented; False otherwise.
    """
    pass


def average_cook_time(restaurant: Restaurant):
    """
    Calculate and print the average cooking time for all orders in the queue.

    Returns:
        float: The average cooking time in minutes. Returns 0 if there are no orders.

    Prints:
        "Average cooking time: [average] minutes." if orders exist, or
        "No orders in queue." if the queue is empty.
    """
    pass


restaurant = Restaurant()
customer = Customer("Alice")
menu = Menu()


def run():
    view_menu(menu)
    order_id = create_order(customer)
    add_to_order(customer, order_id, menu, "chicken")
    add_to_order(customer, order_id, menu, "beef")
    add_to_order(customer, order_id, menu, "vegetables")

    remove_from_order(customer, order_id, menu, "vegetables")
    remove_from_order(customer, order_id, menu, "beef")

    get_receipt(customer, menu)

    add_to_queue(restaurant, customer)
    cooked = cook_order(restaurant)
    if isinstance(cooked, tuple) and len(cooked) == 2:
        cooked_id, time = cooked
        print(cooked_id, time)
    else:
        print(cooked)


run()
  `;
  const tomLiveMockCode = `# Tom's live workspace (mock stream from Tom's personal editor)
from study_problem_classes import Menu, Order, Customer, Restaurant

def add_to_order(customer: Customer, order_id: int, menu: Menu, item: str):
    # Tom is currently struggling with dictionary access and key checks
    if order_id not in customer.order:
        print("No order found")
        return

    if item not in menu.dishes:
        print("Not on menu")
        return

    order = customer.order[order_id]
    order.items.append(item)
    # TODO Tom: update order.cost using menu.dishes[item]
    # TODO Tom: print "Added [item]: [cost]"
    pass

def remove_from_order(customer: Customer, order_id: int, menu: Menu, item: str):
    pass
`;
  const initialPersonalMethod = `def inventory_helper(restaurant: Restaurant, item: str):
    """
    Check if the item is available in inventory and decrement its quantity by one if available.
    """
    if item not in restaurant.inventory:
        return False
    if restaurant.inventory[item] <= 0:
        return False
    restaurant.inventory[item] -= 1
    return True
`;
  const peteReferenceCode = `# Pete solved a similar dictionary-pattern task earlier
def inventory_helper(restaurant, item):
    if item not in restaurant.inventory:
        return False
    if restaurant.inventory[item] <= 0:
        return False
    restaurant.inventory[item] -= 1
    return True

def restock_inventory(restaurant, item, amount):
    if item in restaurant.inventory:
        restaurant.inventory[item] += amount
        print(f"Restocked {item}. New quantity: {restaurant.inventory[item]}")
    else:
        print(f"{item} not found in inventory.")
`;
  const peteTomAssistStarter = `# Pete helper draft for Tom's method
def add_to_order(customer, order_id, menu, item):
    if order_id not in customer.order:
        print("No order found")
        return
    if item not in menu.dishes:
        print("Not on menu")
        return

    order = customer.order[order_id]
    order.items.append(item)
    order.cost += menu.dishes[item]
    print(f"Added {item}: {menu.dishes[item]}")
`;
  const tomMethodSignature = "def add_to_order";

  const [code, setCode] = useState(defaultCode);
  const [isTomInterruptible] = useState(true);

  const [opened, { open, close }] = useDisclosure(false) //Tree Modal NOT REQUIRED
  const [helpOpened, { open: openHelp, close: closeHelp }] = useDisclosure(false);
  const [helpOption, setHelpOption] = useState<string | null>(null);
  const [history, setHistory] = useState([]);
  const [personalCode, setPersonalCode] = useState(initialPersonalMethod);
  const [personalKeystrokes, setPersonalKeystrokes] = useState(0);
  const [showHelpTomSuggestion, setShowHelpTomSuggestion] = useState(false);
  const [isTomCardVisible, setTomCardVisible] = useState(false);
  const [helperAssistActive, setHelperAssistActive] = useState(false);
  const backendServer = "localhost";
  const wsRef = useRef<WebSocket | null>(null);
  const teamEditorRef = useRef<EditorView | null>(null);
  const id = localStorage.getItem('participant-id') || 'D';
  const storedUserId = id.replace(/"/g, '');
  const [collabData, setCollabData] = useState([]);
  const [isCollabModalOpen, setCollabModalOpen] = useState(false);
  const [context, setContext] = useState("");
  const [istaskopen, settaskmodalopen] = useState(false);
  function handleCollabModalOpen() {
    setCollabModalOpen(true);
  }
  function handleCollabModalClose() {
    setCollabModalOpen(false);
  }

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

  const jumpToTomMethod = (methodSignature: string) => {
    if (!teamEditorRef.current) {
      return;
    }
    const view = teamEditorRef.current;
    const doc = view.state.doc.toString();
    const cursorPos = doc.indexOf(methodSignature);
    if (cursorPos < 0) {
      return;
    }
    view.dispatch({
      selection: { anchor: cursorPos },
      scrollIntoView: true,
    });
    view.focus();
  };

  const startHelpingTom = () => {
    setHelperAssistActive(true);
    setShowHelpTomSuggestion(false);
    setCode(tomLiveMockCode);
    setPersonalCode(tomLiveMockCode);
    window.requestAnimationFrame(() => {
      jumpToTomMethod(tomMethodSignature);
    });
  };

  const handlePersonalCodeChange = (value: string) => {
    setPersonalCode(value);
    setPersonalKeystrokes((prev) => prev + 1);
  };

  useEffect(() => {
    if (!helperAssistActive && !isTomCardVisible && personalKeystrokes >= 20) {
      setTomCardVisible(true);
    }
  }, [personalKeystrokes, helperAssistActive, isTomCardVisible]);

  useEffect(() => {
    if (!helperAssistActive) return;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const tick = () => {
      if (cancelled || !teamEditorRef.current) return;
      const view = teamEditorRef.current;
      const doc = view.state.doc.toString();
      const confusionAnchor = doc.indexOf("TODO Tom: update order.cost");
      const fallbackAnchor = doc.indexOf(tomMethodSignature);
      const base = confusionAnchor >= 0 ? confusionAnchor : Math.max(0, fallbackAnchor);
      const shouldMove = Math.random() < 0.35;
      const jitter = shouldMove ? Math.floor(Math.random() * 7) - 3 : 0;
      const next = Math.max(0, Math.min(view.state.doc.length, base + jitter));

      view.dispatch({
        selection: { anchor: next },
        scrollIntoView: true,
      });

      timeoutId = setTimeout(tick, 1800 + Math.floor(Math.random() * 2400));
    };

    timeoutId = setTimeout(tick, 1200);
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [helperAssistActive, tomMethodSignature]);

  // helpee side timing mock removed for helper-side demo.

  useEffect(() => {
    if (storedUserId && !wsRef.current) {
      console.log(`Raw value from localStorage: "${storedUserId}"`);
      const wsUrl = `ws://${backendServer}:8000/ws/${storedUserId}`;
      console.log("WebSocket URL:", wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connection established");
        let payload = {
          cursor: 0,
          doc: ytext.toString(),
          name: storedUserId,
          timeStamp: new Date().getTime(),
        }
        console.log("Sending initial payload:", payload);
        ws.send(JSON.stringify({ event: 'updateMaster', payload: payload }));

        console.log("Configuring personal editor WebSocket extension for user:", storedUserId);
        const playgroundUpdateExtension = createPersonalEditorUpdateExtension(ws, storedUserId);
        setPersonalEditorExtensions([python(), playgroundUpdateExtension]);

      };
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("Received message:", data);
        if (data['event'] === 'run') {
          console.log(data);
          appendToHistory(data['stdout'], data['all']);
        }
        if (data['event'] === 'initial') {
          ytext.insert(0, data['payload']['doc']);
        }
        if (data['event'] == 'notification') {
          const context = data['payload']['context']
          const graphData = data['payload']['suggestions']
          console.log("Graph data:", graphData);
          setContext(context);
          setCollabData(graphData);
          handleCollabModalOpen();

        }
        if (data['event'] == 'StartHelpSession') {
          if (data['payload']['helper'] === storedUserId || data['payload']['helpee'] === storedUserId) {
            const totalDurationSeconds = data['payload']['time']
            const taskContext = data['payload']['hint'] + " please go over to their screen and help them. "
            const helperName = data['payload']['heper']
            setSessionDetails({ totalDurationSeconds, taskContext, helperName });
            setIsSessionStartedModalOpen(true);
          }
        }
        if (data['event'] === 'Suggestion') {
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

    if (!helperAssistActive) {
      setTomCardVisible(true);
      setShowHelpTomSuggestion(true);
    }

    try {
      await fetch(`http://${backendServer}:8000/testFunction`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: code, channel: channel }),
      });
    } catch (e) {
      console.error("Test function request failed:", e);
    }
    console.log("testing personal code:", code);
  }

  function mergeCollaborativeCode() {
    const code = ytext.toString();
    // Implement your merge logic here


    console.log("Merging code:", code);
  }
  async function runPersonalCode() {
    const code = personalCode;
    const channel = storedUserId;

    try {
      await fetch(`http://${backendServer}:8000/test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: code, channel: channel
        })
      });
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

  return (
    <>
      <Container fluid h={"90vh"} p={0}>
        <PanelGroup direction="vertical">

          <Panel defaultSize={75} minSize={35}>
            <PanelGroup direction="horizontal">
              {/* --- Original Team Editor Panel --- */}
              <Panel defaultSize={50} minSize={20}> {/* Adjust defaultSize as needed */}
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <Group justify="space-between" p="xs" style={{ borderBottom: '1px solid #ccc' }}>
                    <Group gap="xs" align="center">
                      {helperAssistActive && (
                        <div
                          style={{
                            width: "30px",
                            height: "30px",
                            borderRadius: "50%",
                            background: "#334155",
                            color: "white",
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "14px",
                            boxSizing: "border-box",
                            border: isTomInterruptible ? "3px solid #22c55e" : "3px solid #ef4444"
                          }}
                        >
                          T
                        </div>
                      )}
                      <Title order={3}>{helperAssistActive ? "Tom's Help Request" : "Team Editor"}</Title>
                    </Group>
                  </Group>
                  <div style={{ flexGrow: 1, overflow: 'auto', position: 'relative' }}> {/* Allow CodeMirror to take remaining space */}
                    <CodeMirror
                      height="100%"
                      value={code}
                      extensions={[
                        python(),
                        yCollab(ytext, provider.awareness),
                        purpleCaretTheme,
                        runIconField,
                        runIconGutter,
                        runIconGutterTheme,
                        ...(helperAssistActive ? [tomAssistField] : []),
                      ]}
                      style={{ height: '100%' }}
                      onCreateEditor={(view) => {
                        teamEditorRef.current = view;
                      }}
                      onChange={(value) => {
                        setCode(value);
                      }}
                    />
                    {isTomCardVisible && (
                      <div
                        className={styles.TomCardPop}
                        style={{
                          position: "absolute",
                          top: "20px",
                          right: "20px",
                          background: "white",
                          padding: "10px 12px",
                          borderRadius: "10px",
                          boxShadow: "0 6px 16px rgba(0,0,0,0.18)",
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          zIndex: 20
                        }}
                      >
                        <div
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "50%",
                            background: "#334155",
                            color: "white",
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "14px",
                            boxSizing: "border-box",
                            border: isTomInterruptible ? "3px solid #22c55e" : "3px solid #ef4444"
                          }}
                        >
                          T
                        </div>
                        <div>
                          <div style={{ fontSize: "12px", fontWeight: 700 }}>Tom</div>
                          {isTomInterruptible ? (
                            <>
                              <div style={{ fontSize: "11px", color: "#16a34a" }}>
                                Interruptible.
                              </div>
                              <div style={{ fontSize: "11px", color: "#111827" }}>
                                Tom tags you for help.
                              </div>
                            </>
                          ) : (
                            <div style={{ fontSize: "11px", color: "#dc2626" }}>
                              Do not interrupt
                            </div>
                          )}
                          {helperAssistActive && (
                            <div style={{ fontSize: "11px", color: "#334155" }}>
                              Live focus: add_to_order
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Panel>
              {/* NEW: Resize Handle */}
              <PanelResizeHandle className={styles.ResizeHandleOuter}>
                <div className={styles.ResizeHandleInner} style={{ backgroundColor: '#eee', height: '5px' }}></div> {/* Basic styling */}
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
                    {showHelpTomSuggestion && !helperAssistActive && (
                      <div
                        style={{
                          margin: "10px",
                          background: "#eff6ff",
                          border: "1px solid #bfdbfe",
                          borderRadius: "10px",
                          padding: "10px 12px"
                        }}
                      >
                        <div style={{ fontSize: "12px", fontWeight: 700, color: "#1d4ed8", marginBottom: "6px" }}>
                          Suggestion for Pete
                        </div>
                        <div style={{ fontSize: "12px", color: "#1f2937", marginBottom: "10px" }}>
                          Tom is blocked on dictionary usage in <code>add_to_order</code>.
                        </div>
                        <Group gap="xs">
                          <Button size="compact-xs" onClick={startHelpingTom}>Take me there</Button>
                          <Button size="compact-xs" variant="light" onClick={() => setShowHelpTomSuggestion(false)}>
                            Dismiss
                          </Button>
                        </Group>
                      </div>
                    )}
                    {helperAssistActive ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px", height: "100%", padding: "10px" }}>
                        <div style={{ fontSize: "12px", fontWeight: 700, color: "#334155" }}>
                          Your editable draft for Tom
                        </div>
                        <div style={{ flexGrow: 1, minHeight: 0 }}>
                          <CodeMirror
                            height="100%"
                            value={personalCode}
                            onChange={handlePersonalCodeChange}
                            extensions={[
                              ...personalEditorExtensions,
                              purpleCaretTheme,
                              runIconField,
                              runIconGutter,
                              runIconGutterTheme,
                              helperAssistField,
                            ]}
                            style={{ height: "100%" }}
                          />
                        </div>
                        <div
                          style={{
                            borderRadius: "8px",
                            border: "1px solid #cbd5e1",
                            background: "#f1f5f9",
                            padding: "8px"
                          }}
                        >
                          <div style={{ fontSize: "11px", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>
                            Pete's similar past solution (read-only reference)
                          </div>
                          <CodeMirror
                            height="170px"
                            value={peteReferenceCode}
                            editable={false}
                            extensions={[python(), referenceHighlightField, referenceHighlightTheme]}
                            style={{ opacity: 0.8 }}
                          />
                        </div>
                      </div>
                    ) : (
                      <CodeMirror
                        height="100%" // Changed from 500px to 100%
                        value={personalCode}
                        onChange={handlePersonalCodeChange}
                        extensions={[
                          ...personalEditorExtensions,
                          runIconField,
                          runIconGutter,
                          runIconGutterTheme,
                        ]}
                        style={{ height: '100%' }} // Ensure CM fills its container
                      />
                    )}
                  </div>
                </div>
              </Panel>
            </PanelGroup>
          </Panel>
          <PanelResizeHandle />

          {/* NEW: Panel below Team Editor */}
          <Panel defaultSize={25} minSize={15}>
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
                            <div style={{ whiteSpace: 'pre-wrap' }}><ReactAnsi logStyle={{ backgroundColor: 'white', color: 'black', fontSize: '10px' }} log={output} /></div>
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
