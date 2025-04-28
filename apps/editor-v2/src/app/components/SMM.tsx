import React, { useState, useEffect, useCallback, useRef } from 'react';
import  {
    ReactFlow,
    useNodesState,
    useEdgesState,
    MiniMap,
    Controls,
    Background,
    Panel, // Use Panel for UI elements overlaying the graph
    MarkerType,
    useReactFlow,
    NodeToolbar,
    Position,
    ReactFlowProvider
} from '@xyflow/react';
// import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import './SMM.css'; 
import { Node, Edge } from '@xyflow/react';
// Assuming jumpToFunction is imported from its location
// import { jumpToFunction } from "./main";

// --- Mock jumpToFunction for standalone example ---
const jumpToFunction = (nodeId) => {
    console.log(`Jumping to function/definition for: ${nodeId}`);
    // Implement your actual navigation logic here
};


const backendServer = '0.0.0.0'; 
const animalId = localStorage.getItem("participant-id") || "D"; 
const storedUserId = animalId.replace(/"/g, '');


// --- Dagre Layout Setup ---
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));
const nodeWidth = 180; // Adjust as needed
const nodeHeight = 40; // Adjust as needed

const getLayoutedElements = (nodes, edges, direction = 'TB') => {
    dagreGraph.setGraph({ rankdir: direction, nodesep: 50, ranksep: 70 }); // Adjust spacing

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        node.targetPosition = 'top'; 
        node.sourcePosition = 'bottom'; 

        // Calculate the node position (centering it)
        node.position = {
            x: nodeWithPosition.x - nodeWidth / 2,
            y: nodeWithPosition.y - nodeHeight / 2,
        };

        return node;
    });

    return { nodes: layoutedNodes, edges };
};

// --- Initial Graph Data ---
const initialNodeIds = [
"Customer", "Restaurant",
  "view_menu", "create_order",  "inventory_helper", "restock_inventory",
  "clear_order",
  "view_order_summary", "add_to_order", "remove_from_order",
  "calculate_order_cost", "get_receipt",
  "cook_time_helper", "cook_order",
  "add_to_queue", "average_cook_time"
];

const initialLinks = [
    { source: "Customer", target: "view_menu" },
    { source: "Customer", target: "create_order" },
    { source: "Restaurant", target: "inventory_helper" },
    { source: "Restaurant", target: "restock_inventory" },
    { source: "Restaurant", target: "cook_time_helper" },
    { source: "create_order", target: "view_order_summary" },
    { source: "create_order", target: "calculate_order_cost" },
    { source: "create_order", target: "clear_order" },
    { source: "create_order", target: "add_to_queue" },
    { source: "view_order_summary", target: "get_receipt" },
    { source: "calculate_order_cost", target: "add_to_order" },
    { source: "calculate_order_cost", target: "remove_from_order" },
    { source: "inventory_helper", target: "cook_order" },
    { source: "cook_time_helper", target: "cook_order" },
    { source: "add_to_queue", target: "cook_order" },
    { source: "cook_time_helper", target: "average_cook_time" },
];


// --- React Component ---
const GraphComponent = () => {
    const reactFlowInstance = useReactFlow();
    const [nodes, setNodes, onNodesChange] = useNodesState<Node[]>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([]);
    const ws = useRef<WebSocket | null>(null); 

    const [tooltipContent, setTooltipContent] = useState<string | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState<{ x: number, y: number } | null>(null);
    const [tooltipVisible, setTooltipVisible] = useState<boolean>(false);

    useEffect(() => {
        const initialNodes = initialNodeIds.map(id => ({
            id: id,
            data: { label: id },
            position: { x: 0, y: 0 }, 
            className: 'unchecked', 
            style: { width: nodeWidth, height: nodeHeight, textAlign: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center' }, // Basic styling
        }));

        const initialEdges = initialLinks.map((link, i) => ({
            id: `e${i}-${link.source}-${link.target}`,
            source: link.source,
            target: link.target,
            markerEnd: { 
                type: MarkerType.ArrowClosed,
            },
            // type: 'smoothstep', // Optional: Use smoothstep edges
            // style: { strokeWidth: 2 }, // Optional: Style edges
        }));
        console.log("Initial nodes and edges:", initialNodes, initialEdges);

        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
            initialNodes,
            initialEdges,
            'TB' // Layout direction: Top to Bottom
        );

        setNodes(layoutedNodes);
        setEdges(layoutedEdges);

        console.log("Layout calculated:", layoutedNodes, layoutedEdges);

    }, []);

    useEffect(() => {
        if (!ws.current || ws.current.readyState === WebSocket.CLOSED) {
            const wsUrl = `wss://${backendServer}:8000/ws/${storedUserId}`;
            console.log(`Attempting to connect WebSocket: ${wsUrl}`);
            ws.current = new WebSocket(wsUrl);

            ws.current.onopen = () => {
                console.log("WebSocket Connected");
                // Optional: Send a message on connect if needed
                // ws.current.send(JSON.stringify({ event: "clientConnected", id: animalId }));
            };

            ws.current.onerror = (error) => {
                console.error("WebSocket Error:", error);
            };

            ws.current.onclose = (event) => {
                console.log("WebSocket Disconnected:", event.reason, `Code: ${event.code}`);
                // Optional: Implement reconnection logic here if desired
            };

            ws.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.debug("WebSocket Message Received:", data); 

                    if (data.event === 'updateGraph' && data.payload && data.payload.graph) {
                        const graphStatus = data.payload.graph;
                        console.log("Received graph update:", graphStatus);

                        setNodes((currentNodes) =>
                            currentNodes.map((node) => {
                                const status = graphStatus[node.id];
                                let newClassName = 'unchecked'; 
                                if (status === 1) {
                                    newClassName = 'checked1';
                                } else if (status === 2) {
                                    newClassName = 'checked2';
                                }

                                // Only return a new object if the class actually changes
                                // React Flow needs immutable updates to detect changes
                                if (node.className !== newClassName) {
                                     console.log(`Updating node ${node.id} className to ${newClassName}`);
                                    return {
                                        ...node,
                                        className: newClassName,
                                        // You might need to spread data and style if you modify them too
                                        // data: { ...node.data },
                                        // style: { ...node.style }
                                        //ADD DATA OF WHO CLAIMED AND WHEN FINISHED
                                    };
                                }
                                return node; 
                            })
                        );
                    }

                } catch (e) {
                    console.error("Failed to parse WebSocket message or update state:", e, "Raw data:", event.data);
                }
            };
        }

        // --- Cleanup Function ---
        // This function is returned by useEffect and runs when the component unmounts
        return () => {
            if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                console.log("Closing WebSocket connection on component unmount");
                ws.current.close();
            }
            // Set ref to null after closing if you have reconnect logic outside this effect
             // ws.current = null;
        };
        // Add dependencies carefully. If animalId can change, add it here.
    }, [animalId, setNodes]); // Re-run effect if animalId changes


    const onNodeClick = useCallback((event, node) => {
        console.log(`Node clicked: ${node.id}`, node);
        jumpToFunction(node.id); // Call your navigation function

        // Send update via WebSocket
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            const message = {
                event: "updateNode",
                payload: { node: node.id, id: animalId }
            };
            console.log("Sending WebSocket message:", message);
            ws.current.send(JSON.stringify(message));
        } else {
            console.error("WebSocket not open. Cannot send updateNode message.");
            // Optionally queue the message or show an error to the user
        }
    }, [animalId]); // Include dependencies needed by the handler


    // --- Tooltip / Mouse Hover Handling (Basic Example) ---
    const onNodeMouseEnter = useCallback(async (event, node) => {
        console.log(`Mouse enter node: ${node.id}`);
        // Example: Add a temporary class for hover effect
        setNodes((nds) => nds.map(n => n.id === node.id ? { ...n, className: `${n.className} hovered` } : n));

        const nodeW = node.measured?.width || node.style?.width || nodeWidth;
        const nodeH = node.measured?.height || node.style?.height || nodeHeight;

        // Project node's graph position (top-left corner) to screen coordinates
        const nodeScreenPos = reactFlowInstance.flowToScreenPosition({
            x: node.position.x,
            y: node.position.y,
        });

        // Calculate position for tooltip (e.g., centered below the node)
        const tooltipX = nodeScreenPos.x-10; // Centered horizontally
        const tooltipY = nodeScreenPos.y  ;  // Positioned below the node with a 5px gap

        setTooltipContent('Loading...'); // Show loading state
        setTooltipPosition({ x: tooltipX, y:node.position.y });
        setTooltipVisible(true);

        // --- Fetch Tooltip Data (Example) ---
        try {
            const response = await fetch(`https://${backendServer}:8000/lookup/${node.id}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            console.log(`Tooltip data for ${node.id}:`, data);
            if (data.html) {
                setTooltipContent(data.html);
                setTooltipVisible(true);
            } else {
                 setTooltipContent('No details available.'); 
            }

            
            // Here you would integrate with your tooltip library to show data.html
            // e.g., setTooltipContent(data.html); setTooltipTarget(event.target);
        } catch (error) {
            console.error(`Failed to fetch tooltip data for ${node.id}:`, error);
            // Show error in tooltip or console
        }
        // ---------------------------------------

    }, [setNodes, setTooltipVisible, setTooltipContent, setTooltipPosition]);

    const onNodeMouseLeave = useCallback((event, node) => {
        console.log(`Mouse leave node: ${node.id}`);
        // Remove temporary hover class
        setNodes((nds) => nds.map(n => n.id === node.id ? { ...n, className: n.className.replace(' hovered', '') } : n));
        // Hide tooltip using your library's method
        // e.g., hideTooltip();
        setTooltipVisible(false);
 
    }, [setNodes, setTooltipVisible]);


    // --- Render Component ---
    return (
        // Ensure the container has a defined height for React Flow to render correctly
        <div style={{ height: '80vh', width: '100%', border: '1px solid #eee' }}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange} // Handles node dragging, selection, etc.
                onEdgesChange={onEdgesChange} // Handles edge selection, deletion
                onNodeClick={onNodeClick}
                onNodeMouseEnter={onNodeMouseEnter}
                onNodeMouseLeave={onNodeMouseLeave}
                // onConnect={onConnect} // If you need to handle edge creation interactively
                fitView // Zooms/pans to fit the graph initially
                fitViewOptions={{ padding: 0.1 }} // Add some padding on fitView
                nodesDraggable={true} // Allow nodes to be dragged
                nodesConnectable={false} // Disable connecting nodes by dragging handles (optional)
                className="my-react-flow-graph" // Add a class for specific styling
            >
                {/* Add UI Controls */}
                <Controls />
                <MiniMap nodeStrokeWidth={3} zoomable pannable />
                <Background variant="dots" gap={15} size={1} />

                {/* Optional: Add a panel for status or buttons */}
                <Panel position="top-left">
                    <div>Graph Status</div>
                    {/* You could display WebSocket connection status here */}
                </Panel>
            </ReactFlow>
            {tooltipVisible && tooltipPosition&&( <div
                    style={{
                        position: 'absolute',
                        left: tooltipPosition ? tooltipPosition.x : 0, // Offset from cursor
                        top: tooltipPosition ? tooltipPosition.y : 0,
                        transform: 'translateX(-50%)',
                        backgroundColor: 'rgba(0, 0, 0, 0.85)', // Dark background
                        color: 'white',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontFamily: 'sans-serif',
                        maxWidth: '350px',
                        zIndex: 1001, // Ensure high z-index
                        pointerEvents: 'none', // Important: prevent tooltip from capturing mouse events
                        whiteSpace: 'pre-wrap', // Respect formatting
                        boxShadow: '0 2px 5px rgba(0,0,0,0.2)', // Optional shadow
                        // Smooth transition (optional)
                        // transition: 'opacity 0.1s ease-in-out',
                        // opacity: 1, // Start visible (can be used with transition)
                    }}
                    // Remember the security warning about dangerouslySetInnerHTML!
                    // Sanitize data.html if it's not from a fully trusted source.
                    dangerouslySetInnerHTML={{ __html: tooltipContent || '' }} // Use empty string if content is null
                />)}
        </div>
    );
};

export default GraphComponent;