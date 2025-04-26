import React, { useState, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './puzzleStyles.css'; // We'll create this for styling

// --- Puzzle Data (Paste the code from Step 2 here) ---
// Define the nodes for the puzzle
const puzzleNodeIds = [
  "Restaurant", "Customer",
  "view_menu", "create_order", "clear_order",
  "view_order_summary", "add_to_order", "remove_from_order",
  "calculate_order_cost", "get_receipt", "inventory_helper",
  "cook_time_helper", "restock_inventory", "cook_order",
  "add_to_queue", "average_cook_time"
];

// Define the correct connections (solution)
// Store as a Set for efficient lookup
const correctLinksSet = new Set(
  [
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
  ].map(link => `${link.source}->${link.target}`) // Store as "source->target" strings
);

// Helper function to generate initial positions (simple grid layout)
// const getInitialNodePositions = (nodeIds) => {
//     const nodes = [];
//     const columns = 4; // Adjust as needed
//     const xSpacing = 200;
//     const ySpacing = 100;

//     nodeIds.forEach((id, index) => {
//         nodes.push({
//         id: id,
//         // Calculate position in a grid-like manner
//         position: {
//             x: (index % columns) * xSpacing + 50, // Add some offset
//             y: Math.floor(index / columns) * ySpacing + 50, // Add some offset
//         },
//         data: { label: id },
//         // Use input/output types for clarity if desired, otherwise 'default'
//         type: 'default',
//         });
//     });
//     return nodes;
// };


// Canvas starts empty
const initialNodes: any[] = [];
// const initialEdges = [];

// --- React Component ---
export default function PuzzleApp() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [correctEdges, setCorrectEdges, onCorrectEdgesChange] = useEdgesState([]);
  const [incorrectEdges, setIncorrectEdges, onIncorrectEdgesChange] = useEdgesState<{ source: string; target: string; className?: string }[]>([]);

  const [availableNodes, setAvailableNodes] = useState(puzzleNodeIds);

  const allEdges = useMemo(() => [...correctEdges, ...incorrectEdges], [correctEdges, incorrectEdges]);

  const addNodeToCanvas = useCallback((nodeIdToAdd) => {
    // Remove from available nodes
    setAvailableNodes((prev) => prev.filter(id => id !== nodeIdToAdd));

    // Add to canvas nodes
    const newNode = {
      id: nodeIdToAdd,
      // Initial position - place it somewhere predictable, e.g., near top-left
      // More advanced: could calculate center of current view
      position: { x: Math.random() * 200 + 50, y: Math.random() * 100 + 50 }, // Add slight randomness
      data: { label: nodeIdToAdd },
      type: 'default', // Or your custom node type
    };
    setNodes((nds) => nds.concat(newNode));
  }, [setNodes, setAvailableNodes]); // Dependencies: setNodes, setAvailableNodes


  // --- Connection Validation Logic (Remains the same) ---
  const onConnect = useCallback(
    (params) => {
      const connectionId = `${params.source}->${params.target}`;
      const edgeExists = correctEdges.some(edge => `${edge.source}->${edge.target}` === connectionId) ||
                         incorrectEdges.some(edge => `${edge.source}->${edge.target}` === connectionId);
      if (edgeExists) return;
      if (correctLinksSet.has(connectionId)) {
        setCorrectEdges((eds) => addEdge({ ...params, id: `${params.source}-${params.target}`, className: 'correct-edge', animated: true }, eds));
      } else {
        setIncorrectEdges((eds) => addEdge({ ...params, id: `${params.source}-${params.target}`, className: 'incorrect-edge' }, eds));
      }
    },
    [setCorrectEdges, setIncorrectEdges, correctEdges, incorrectEdges]
  );

   const handleEdgesChange = useCallback(
      (changes) => { onCorrectEdgesChange(changes); onIncorrectEdgesChange(changes); },
      [onCorrectEdgesChange, onIncorrectEdgesChange]
   );

  // --- Puzzle Completion Check (Remains the same) ---
  const isPuzzleComplete = useMemo(() => correctEdges.length === correctLinksSet.size, [correctEdges]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
       {isPuzzleComplete && (
        <div className="p-4 bg-green-200 text-green-800 font-bold text-center flex-shrink-0"> {/* Don't let banner shrink */}
          Puzzle Complete! Well done!
        </div>
      )}

      {/* React Flow Canvas Container - Fixed Height */}
      {/* Added border for visibility */}
      <div className="w-full border-b border-gray-300" style={{ height: '500px' }}>
        <ReactFlow
          nodes={nodes}
          edges={allEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          fitView // Fit view when nodes are added/changed
          // fitViewOptions={{ padding: 0.2 }} // Add padding on fitView
        >
          <Controls />
          <MiniMap />
          <Background variant="dots" gap={12} size={1} />
        </ReactFlow>
      </div>

      {/* Node Palette Container - Takes remaining space */}
      <div className="flex-1 w-full p-4 overflow-y-auto bg-gray-100">
        <h3 className="text-lg font-semibold mb-3">Available Nodes</h3>
        <div className="flex flex-wrap gap-2">
          {availableNodes.map((nodeId) => (
            <button
              key={nodeId}
              onClick={() => addNodeToCanvas(nodeId)}
              className="px-3 py-1.5 bg-white border border-gray-300 rounded shadow hover:bg-gray-50 cursor-pointer text-sm"
            >
              {nodeId}
            </button>
          ))}
          {availableNodes.length === 0 && nodes.length > 0 && ( // Show message only if palette is empty but canvas has nodes
             <p className="text-gray-500">All nodes added to the canvas.</p>
          )}
           {availableNodes.length === 0 && nodes.length === 0 && ( // Initial state message
             <p className="text-gray-500">Click nodes to add them to the canvas above.</p>
           )}
        </div>
      </div>
    </div>
  );
}