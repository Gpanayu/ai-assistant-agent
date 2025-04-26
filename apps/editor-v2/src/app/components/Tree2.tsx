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
import './puzzleStyles.css'; 
const puzzleNodeIds = [
  "Customer", "Restaurant",
  "view_menu", "create_order", "clear_order",
  "view_order_summary", "add_to_order", "remove_from_order",
  "calculate_order_cost", "get_receipt", "inventory_helper",
  "cook_time_helper", "restock_inventory", "cook_order",
  "add_to_queue", "average_cook_time"
];


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
  ].map(link => `${link.source}->${link.target}`) 
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

export default function PuzzleApp() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [correctEdges, setCorrectEdges, onCorrectEdgesChange] = useEdgesState([]);
  const [incorrectEdges, setIncorrectEdges, onIncorrectEdgesChange] = useEdgesState<{ source: string; target: string; className?: string }[]>([]);

  const [availableNodes, setAvailableNodes] = useState(puzzleNodeIds);

  const allEdges = useMemo(() => [...correctEdges, ...incorrectEdges], [correctEdges, incorrectEdges]);

  const addNodeToCanvas = useCallback((nodeIdToAdd) => {
    setAvailableNodes((prev) => prev.filter(id => id !== nodeIdToAdd));


    const newNode = {
      id: nodeIdToAdd,
  
      position: { x: Math.random() * 200 + 50, y: Math.random() * 100 + 50 }, 
      data: { label: nodeIdToAdd },
      type: 'default',
    };
    setNodes((nds) => nds.concat(newNode));
  }, [setNodes, setAvailableNodes]); 


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

  const isPuzzleComplete = useMemo(() => correctEdges.length === correctLinksSet.size, [correctEdges]);

  return (
    <div className="puzzle-app-container">
       {isPuzzleComplete && (
        <div className="completion-banner">
          Puzzle Complete! Well done!
        </div>
      )}

      <div className="canvas-container" style={{ height: '500px' }}>
        <ReactFlow
          nodes={nodes}
          edges={allEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          fitView
        >
          <Controls />
          <MiniMap />
          <Background variant="dots" gap={12} size={1} />
        </ReactFlow>
      </div>

      <div className="palette-container">
        <h3 className="palette-title">Available Nodes</h3>
        <div className="palette-nodes">
          {availableNodes.map((nodeId) => (
            <button
              key={nodeId}
              onClick={() => addNodeToCanvas(nodeId)}
              className="palette-node-button"
            >
              {nodeId}
            </button>
          ))}
          {availableNodes.length === 0 && nodes.length > 0 && (
             <p className="palette-message">All nodes added to the canvas.</p>
          )}
           {availableNodes.length === 0 && nodes.length === 0 && (
             <p className="palette-message">Click nodes to add them to the canvas above.</p>
           )}
        </div>
      </div>
    </div>
  );
}