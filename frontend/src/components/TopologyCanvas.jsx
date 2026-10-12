import React, { useMemo } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  Handle, 
  Position 
} from '@xyflow/react';
import { 
  Wifi, 
  Laptop, 
  Video, 
  Globe, 
  DownloadCloud, 
  ShieldAlert, 
  Cpu, 
  AlertCircle 
} from 'lucide-react';

// Custom Router Node
function RouterNode({ data }) {
  const isCongested = data.details?.congestion_state === 'congested';
  return (
    <div className={`px-4 py-3 rounded-2xl bg-slate-900 border transition-all shadow-xl min-w-[200px] text-center ${
      isCongested 
        ? 'border-rose-500 ring-2 ring-rose-500/30 shadow-rose-500/20' 
        : 'border-sky-500/40 shadow-sky-500/10'
    }`}>
      <Handle type="target" position={Position.Top} className="!bg-sky-400" />
      <div className="flex items-center justify-center gap-2 mb-1.5">
        <div className={`p-2 rounded-xl ${isCongested ? 'bg-rose-500/20 text-rose-400' : 'bg-sky-500/20 text-sky-400'}`}>
          <Wifi className="w-5 h-5 animate-pulse" />
        </div>
        <div className="text-left">
          <div className="text-xs font-bold text-slate-100">{data.label}</div>
          <div className="text-[10px] text-slate-400">Bottleneck: {data.details?.bottleneck_capacity_mbps} Mbps</div>
        </div>
      </div>
      <div className="mt-2 pt-2 border-t border-slate-800 flex justify-between text-[11px] text-slate-300">
        <span>Util: <b className={isCongested ? 'text-rose-400' : 'text-sky-300'}>{data.details?.link_utilization_pct || 0}%</b></span>
        <span>Queue: <b>{data.details?.queue_occupancy_pct || 0}%</b></span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-sky-400" />
    </div>
  );
}

// Custom Client Node
function ClientNode({ data }) {
  const cat = data.category || 'best_effort';
  const getCategoryConfig = () => {
    switch (cat) {
      case 'real_time':
        return {
          icon: Video,
          color: 'text-amber-400 bg-amber-500/10 border-amber-500/40',
          badge: 'Real-Time (Video/Voice)',
          badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        };
      case 'bulk':
        return {
          icon: DownloadCloud,
          color: 'text-purple-400 bg-purple-500/10 border-purple-500/40',
          badge: 'Bulk Transfer',
          badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
        };
      default:
        return {
          icon: Globe,
          color: 'text-sky-400 bg-sky-500/10 border-sky-500/40',
          badge: 'Best-Effort (Web)',
          badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
        };
    }
  };

  const config = getCategoryConfig();
  const Icon = config.icon;
  const hasLoss = (data.details?.packet_loss_pct || 0) > 0;

  return (
    <div className={`px-3 py-2.5 rounded-xl bg-slate-900 border transition-all shadow-md min-w-[170px] ${config.color} hover:border-slate-500 cursor-pointer`}>
      <Handle type="source" position={Position.Top} className="!bg-slate-400" />
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 shrink-0" />
        <div className="text-xs font-semibold text-slate-100 truncate">{data.label}</div>
      </div>
      <div className="flex items-center justify-between gap-1 mt-1">
        <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${config.badgeColor}`}>
          {data.details?.offered_load_mbps} Mbps
        </span>
        {hasLoss && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-0.5">
            <AlertCircle className="w-2.5 h-2.5" /> {data.details?.packet_loss_pct}%
          </span>
        )}
      </div>
    </div>
  );
}

// Custom Monitor Node
function MonitorNode({ data }) {
  return (
    <div className="px-3 py-2 rounded-xl bg-slate-900/90 border border-amber-500/40 shadow-lg text-center min-w-[150px]">
      <Handle type="target" position={Position.Bottom} className="!bg-amber-400" />
      <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-amber-400">
        <ShieldAlert className="w-4 h-4" />
        {data.label}
      </div>
      <div className="text-[10px] text-slate-400 mt-1 capitalize font-medium">State: <b className="text-amber-300">{data.details?.state}</b></div>
    </div>
  );
}

// Custom Controller Node
function ControllerNode({ data }) {
  return (
    <div className="px-3 py-2 rounded-xl bg-slate-900/90 border border-indigo-500/40 shadow-lg text-center min-w-[150px]">
      <Handle type="source" position={Position.Top} className="!bg-indigo-400" />
      <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-indigo-400">
        <Cpu className="w-4 h-4" />
        {data.label}
      </div>
      <div className="text-[10px] text-slate-400 mt-1 truncate">Mode: <b className="text-indigo-300">{data.details?.qos_mode}</b></div>
    </div>
  );
}

export function TopologyCanvas({ topology, onSelectNode }) {
  const nodeTypes = useMemo(() => ({
    router: RouterNode,
    client: ClientNode,
    monitor: MonitorNode,
    controller: ControllerNode,
  }), []);

  if (!topology || !topology.nodes) {
    return (
      <div className="h-[520px] flex items-center justify-center bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400 text-sm">
        Loading network topology...
      </div>
    );
  }

  // Format React Flow nodes and edges
  const flowNodes = topology.nodes.map(n => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: {
      label: n.label,
      category: n.category,
      details: n.details,
    },
  }));

  const flowEdges = topology.edges.map(e => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    animated: e.animated,
    className: e.is_congested ? 'edge-congested' : 'edge-normal',
    style: {
      strokeWidth: e.is_congested ? 3.5 : 2,
    },
    labelStyle: {
      fill: '#94a3b8',
      fontSize: 10,
      fontWeight: 600,
    },
    labelBgStyle: {
      fill: '#0f172a',
      fillOpacity: 0.85,
    },
  }));

  return (
    <div className="relative h-[550px] w-full rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl">
      {/* Legend Banner */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-3 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
        <span className="font-semibold text-slate-300">Traffic Classes:</span>
        <span className="flex items-center gap-1 text-amber-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-amber-400"></span> Real-Time (Video/Voice)
        </span>
        <span className="flex items-center gap-1 text-sky-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-sky-400"></span> Best-Effort (Web)
        </span>
        <span className="flex items-center gap-1 text-purple-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-purple-400"></span> Bulk (File Transfer)
        </span>
      </div>

      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onNodeClick={(evt, node) => {
          onSelectNode({
            id: node.id,
            type: node.type,
            label: node.data.label,
            category: node.data.category,
            details: node.data.details,
          });
        }}
        fitView
      >
        <Background color="#1e293b" gap={20} size={1} />
        <Controls className="!bg-slate-900 !border-slate-800 !text-slate-300" />
      </ReactFlow>
    </div>
  );
}
