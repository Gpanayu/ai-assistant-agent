import { ReactFlow, Background, Controls } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const nodes = [
  {
    id: '1',
    position: { x: 0, y: 0 },
    data: { label: 'Hello' },
  },
];

export default function Tree() {
  return (
      <ReactFlow nodes={nodes}>
        <Background />
        <Controls />
      </ReactFlow>
  );
}
