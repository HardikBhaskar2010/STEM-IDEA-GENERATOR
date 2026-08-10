import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type OnConnect,
  type OnNodesChange,
  type OnEdgesChange,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useCircuitStore } from '@/store/useCircuitStore';
import type { PlacedComponent, Connection } from '@/store/useCircuitStore';
import { nodeTypes } from './nodeTypes';
import { WireEdge } from './WireEdge';
import { MousePointer2, RotateCcw, Trash2 } from 'lucide-react';

// ─── Custom edge registry ─────────────────────────────────────────────────────

const edgeTypes = { wire: WireEdge };

// ─── Conversion helpers ───────────────────────────────────────────────────────

function compToNode(comp: PlacedComponent): Node {
  return {
    id: comp.id,
    type: comp.type,
    position: comp.position,
    data: comp as unknown as Record<string, unknown>,
    // Encode rotation as a CSS transform on the node container
    style: comp.rotation
      ? { transform: `rotate(${comp.rotation}deg)`, transformOrigin: 'center' }
      : undefined,
  };
}

function connToEdge(conn: Connection): Edge {
  return {
    id: conn.id,
    source: conn.from.split('-').slice(0, -1).join('-'),   // component id
    sourceHandle: conn.from.split('-').slice(-1)[0],        // pin id
    target: conn.to.split('-').slice(0, -1).join('-'),
    targetHandle: conn.to.split('-').slice(-1)[0],
    type: 'wire',
    data: { isLive: conn.isLive, connectionId: conn.id },
    animated: false,
  };
}

// ─── Toolbar ─────────────────────────────────────────────────────────────────

const SNAP: [number, number] = [40, 40];

const Toolbar: React.FC<{
  selectedNodeId: string | null;
  onRotate: () => void;
  onDelete: () => void;
  transformMode: 'rotate' | null;
  setTransformMode: (m: 'rotate' | null) => void;
}> = ({ selectedNodeId, onRotate, onDelete, transformMode, setTransformMode }) => (
  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1.5 bg-black/70 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-50 hover:border-cyan-500/30 transition-all">
    {[
      { id: null, icon: MousePointer2, label: 'Select' },
      { id: 'rotate' as const, icon: RotateCcw, label: 'Rotate (R)' },
    ].map((btn) => (
      <button
        key={btn.label}
        onClick={() => setTransformMode(transformMode === btn.id ? null : btn.id)}
        className={`group relative p-2.5 rounded-xl transition-all ${
          transformMode === btn.id
            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
            : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
        }`}
        title={btn.label}
      >
        <btn.icon size={18} />
        <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/80 text-[10px] text-white rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none border border-white/10 transition-opacity">
          {btn.label}
        </span>
      </button>
    ))}

    <div className="w-[1px] h-6 bg-white/10 mx-1" />

    <button
      onClick={onDelete}
      disabled={!selectedNodeId}
      className={`group relative p-2.5 rounded-xl border border-transparent transition-all ${
        selectedNodeId ? 'text-red-400 hover:bg-red-500/10 hover:border-red-500/20' : 'text-gray-700 cursor-not-allowed'
      }`}
      title="Delete selected"
    >
      <Trash2 size={18} />
    </button>

    <div className="w-[1px] h-6 bg-white/10 mx-1" />

    <div className="px-3 py-1 flex flex-col">
      <span className="text-[9px] font-bold text-cyan-400/80 uppercase tracking-tighter italic">Schematic</span>
      <span className="text-[10px] text-gray-500 font-mono lowercase">2D canvas</span>
    </div>
  </div>
);

// ─── Inner canvas (must be inside ReactFlowProvider) ────────────────────────

const SchematicCanvasInner: React.FC = () => {
  const {
    components,
    connections,
    selectedComponentId,
    setSelectedComponentId,
    updateComponent,
    removeComponent,
    removeConnection,
    connectPins,
    transformMode,
    setTransformMode,
  } = useCircuitStore();

  // Convert store state → RF nodes/edges
  const nodes = useMemo(() => components.map(compToNode), [components]);
  const edges = useMemo(() => connections.map(connToEdge), [connections]);

  // ── Node drag: persist new position to store ──
  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      changes.forEach((change) => {
        if (change.type === 'position' && change.position) {
          updateComponent(change.id, { position: change.position });
        }
        if (change.type === 'remove') {
          removeComponent(change.id);
        }
        if (change.type === 'select') {
          if (change.selected) setSelectedComponentId(change.id);
        }
      });
    },
    [updateComponent, removeComponent, setSelectedComponentId]
  );

  // ── Edge changes ──
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      changes.forEach((change) => {
        if (change.type === 'remove') {
          removeConnection(change.id);
        }
      });
    },
    [removeConnection]
  );

  // ── New connection drawn ──
  const onConnect: OnConnect = useCallback(
    (params) => {
      if (!params.source || !params.target) return;
      const fromPin = `${params.source}-${params.sourceHandle}`;
      const toPin   = `${params.target}-${params.targetHandle}`;
      connectPins(fromPin, toPin);
    },
    [connectPins]
  );

  // ── Click on node selects it; click on canvas deselects ──
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedComponentId(node.id);
      if (transformMode === 'rotate') {
        const comp = components.find((c) => c.id === node.id);
        if (comp) {
          const next = ((comp.rotation ?? 0) + 90) % 360;
          updateComponent(node.id, { rotation: next });
        }
      }
    },
    [setSelectedComponentId, transformMode, components, updateComponent]
  );

  const onPaneClick = useCallback(() => {
    setSelectedComponentId(null);
  }, [setSelectedComponentId]);

  // ── Delete via toolbar ──
  const handleDelete = useCallback(() => {
    if (selectedComponentId) removeComponent(selectedComponentId);
  }, [selectedComponentId, removeComponent]);

  // ── Keyboard shortcut: R = rotate ──
  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        setTransformMode(transformMode === 'rotate' ? null : 'rotate');
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedComponentId) {
        // Only delete if not typing in an input
        if (document.activeElement?.tagName !== 'INPUT') {
          removeComponent(selectedComponentId);
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [transformMode, selectedComponentId, setTransformMode, removeComponent]);

  return (
    <div className="relative w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        snapToGrid
        snapGrid={SNAP}
        fitView
        fitViewOptions={{ padding: 0.15, maxZoom: 1.4 }}
        minZoom={0.3}
        maxZoom={3}
        defaultEdgeOptions={{ type: 'wire' }}
        connectionRadius={20}
        style={{ background: 'linear-gradient(to bottom, #020810 0%, #050a18 100%)' }}
      >
        {/* Grid background — dots on 40px grid */}
        <Background
          variant={BackgroundVariant.Dots}
          gap={40}
          size={1.5}
          color="#1a4a4a"
        />

        {/* Controls: zoom in/out/fit */}
        <Controls
          style={{ background: '#0a1628', border: '1px solid #1a3a3a', borderRadius: 8 }}
          showInteractive={false}
        />

        {/* Mini-map */}
        <MiniMap
          nodeColor={(node) => {
            const typeColors: Record<string, string> = {
              arduino: '#166534',
              led: '#ef4444',
              resistor: '#f59e0b',
              button: '#dc2626',
              potentiometer: '#a855f7',
              buzzer: '#f59e0b',
              servo: '#1e40af',
              ldr: '#92400e',
              breadboard: '#78716c',
            };
            return typeColors[node.type ?? ''] ?? '#334155';
          }}
          style={{ background: '#050a18', border: '1px solid #1a3a3a', borderRadius: 6 }}
          maskColor="#00000060"
        />
      </ReactFlow>

      {/* Toolbar */}
      <Toolbar
        selectedNodeId={selectedComponentId}
        onRotate={() => {
          if (selectedComponentId) {
            const comp = components.find((c) => c.id === selectedComponentId);
            if (comp) updateComponent(selectedComponentId, { rotation: ((comp.rotation ?? 0) + 90) % 360 });
          }
        }}
        onDelete={handleDelete}
        transformMode={transformMode}
        setTransformMode={setTransformMode}
      />

      {/* Workspace label */}
      <div className="absolute top-3 left-3 pointer-events-none">
        <span className="text-cyan-400/50 text-xs font-mono">2D SCHEMATIC</span>
      </div>
    </div>
  );
};

// ─── Exported component (wraps provider) ─────────────────────────────────────

export const SchematicCanvas: React.FC<{ className?: string }> = ({ className }) => (
  <ReactFlowProvider>
    <div className={`w-full h-full ${className ?? ''}`}>
      <SchematicCanvasInner />
    </div>
  </ReactFlowProvider>
);

export default SchematicCanvas;
