import React, { useMemo } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  Handle, 
  Position,
  BaseEdge,
  getSmoothStepPath,
  EdgeLabelRenderer
} from '@xyflow/react';
import { 
  Wifi, 
  Laptop, 
  Video, 
  Globe, 
  DownloadCloud, 
  ShieldAlert, 
  Cpu, 
  AlertCircle,
  HardDrive,
  Server,
  Zap,
  Flame,
  CheckCircle2,
  Clock,
  Layers
} from 'lucide-react';

// ==========================================
// CUSTOM NODES
// ==========================================

// 1. Virtual Client Node
function ClientNode({ data }) {
  const cat = data.category || 'best_effort';
  const getCategoryConfig = () => {
    switch (cat) {
      case 'real_time':
        return {
          icon: Video,
          color: 'text-amber-400 bg-slate-900 border-amber-500/40 shadow-amber-500/5',
          badge: 'Real-Time (Video/Voice)',
          badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          dot: 'bg-amber-400'
        };
      case 'bulk':
        return {
          icon: DownloadCloud,
          color: 'text-purple-400 bg-slate-900 border-purple-500/40 shadow-purple-500/5',
          badge: 'Bulk Transfer',
          badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
          dot: 'bg-purple-400'
        };
      default:
        return {
          icon: Globe,
          color: 'text-sky-400 bg-slate-900 border-sky-500/40 shadow-sky-500/5',
          badge: 'Best-Effort (Web)',
          badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
          dot: 'bg-sky-400'
        };
    }
  };

  const config = getCategoryConfig();
  const Icon = config.icon;
  const hasLoss = (data.details?.packet_loss_pct || 0) > 0;
  const isBursting = data.details?.is_bursting;
  const throughput = data.details?.delivered_throughput_mbps || 0;
  const offered = data.details?.offered_load_mbps || 0;
  const latency = data.details?.avg_latency_ms || 5.0;

  return (
    <div className={`px-3 py-2.5 rounded-xl border transition-all shadow-lg min-w-[210px] max-w-[230px] ${config.color} hover:border-slate-400 cursor-pointer`}>
      <Handle type="source" position={Position.Right} className="!bg-slate-400 !w-2.5 !h-2.5" />
      
      {/* Client Title Bar */}
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <div className="flex items-center gap-1.5 truncate">
          <Icon className="w-3.5 h-3.5 shrink-0" />
          <span className="text-xs font-bold text-slate-100 truncate">{data.label}</span>
        </div>
        {isBursting && (
          <span className="shrink-0 flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
            <Flame className="w-2.5 h-2.5 text-amber-400" /> Burst
          </span>
        )}
      </div>

      {/* Category Pill */}
      <div className="mb-2">
        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border inline-block ${config.badgeColor}`}>
          {config.badge}
        </span>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] pt-1.5 border-t border-slate-800">
        <div className="flex justify-between">
          <span className="text-slate-400">Demand:</span>
          <span className="font-semibold text-slate-200">{offered}M</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Throughput:</span>
          <span className="font-semibold text-sky-300">{throughput}M</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Latency:</span>
          <span className={`font-semibold ${latency > 40 ? 'text-amber-400' : 'text-emerald-400'}`}>{latency}ms</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Loss:</span>
          <span className={`font-semibold ${hasLoss ? 'text-rose-400 font-bold' : 'text-slate-400'}`}>
            {data.details?.packet_loss_pct || 0}%
          </span>
        </div>
      </div>
    </div>
  );
}

// 2. Wi-Fi Router / Access Point Node
function RouterNode({ data }) {
  const isCongested = data.details?.congestion_state === 'congested';
  const isWarning = data.details?.congestion_state === 'warning';
  const util = data.details?.link_utilization_pct || 0;
  const capacity = data.details?.bottleneck_capacity_mbps || 50;
  const ingress = data.details?.ingress_mbps || 0;

  let stateColor = 'border-sky-500/40 shadow-sky-500/10';
  let badgeColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  let badgeText = 'Normal';

  if (isCongested) {
    stateColor = 'border-rose-500 ring-2 ring-rose-500/30 shadow-rose-500/20';
    badgeColor = 'bg-rose-500/20 text-rose-400 border-rose-500/30 animate-pulse';
    badgeText = 'Congested';
  } else if (isWarning) {
    stateColor = 'border-amber-500 ring-1 ring-amber-500/30 shadow-amber-500/10';
    badgeColor = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    badgeText = 'High Load';
  }

  return (
    <div className={`px-4 py-3 rounded-2xl bg-slate-900 border transition-all shadow-xl min-w-[210px] text-center ${stateColor}`}>
      {/* Handles */}
      <Handle type="target" position={Position.Left} className="!bg-sky-400 !w-2.5 !h-2.5" />
      <Handle type="source" position={Position.Right} className="!bg-sky-400 !w-2.5 !h-2.5" />
      <Handle type="source" id="top" position={Position.Top} className="!bg-amber-400 !w-2.5 !h-2.5" />

      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-sky-500/20 text-sky-400">
            <Wifi className="w-4 h-4 animate-pulse" />
          </div>
          <div className="text-left">
            <div className="text-xs font-bold text-slate-100">{data.label}</div>
            <div className="text-[10px] text-slate-400">Shared AP Bottleneck</div>
          </div>
        </div>
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>
          {badgeText}
        </span>
      </div>

      {/* Capacity & Ingress */}
      <div className="grid grid-cols-2 gap-1.5 text-[10px] text-left mb-2 bg-slate-950/60 p-2 rounded-xl border border-slate-800">
        <div>
          <span className="text-slate-400 block text-[9px]">Capacity</span>
          <span className="font-bold text-slate-200">{capacity} Mbps</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[9px]">Ingress Load</span>
          <span className="font-bold text-sky-300">{ingress} Mbps</span>
        </div>
      </div>

      {/* Utilization Bar */}
      <div>
        <div className="flex justify-between text-[10px] text-slate-300 mb-1">
          <span>Channel Utilization</span>
          <b className={util > 90 ? 'text-rose-400' : 'text-sky-300'}>{util}%</b>
        </div>
        <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 ${util > 90 ? 'bg-rose-500' : (util > 75 ? 'bg-amber-500' : 'bg-sky-400')}`}
            style={{ width: `${Math.min(100, util)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// 3. Bottleneck Queue & Scheduler Node
function QueueNode({ data }) {
  const occ = data.details?.queue_occupancy_pct || 0;
  const occBytes = Math.round((data.details?.queue_occupancy_bytes || 0) / 1000);
  const capBytes = Math.round((data.details?.queue_capacity_bytes || 500000) / 1000);
  const drops = data.details?.packet_drops || 0;
  const isThrottling = data.details?.is_throttling;
  const qosMode = data.details?.qos_mode || 'baseline';

  let fillGradient = 'from-emerald-500 to-sky-500';
  let queueBorder = 'border-slate-700';
  if (occ > 70) {
    fillGradient = 'from-rose-500 to-amber-500 animate-pulse';
    queueBorder = 'border-rose-500 ring-2 ring-rose-500/20';
  } else if (occ > 40) {
    fillGradient = 'from-amber-500 to-amber-400';
    queueBorder = 'border-amber-500/60';
  }

  const getPolicyBadge = () => {
    if (qosMode === 'adaptive_qos') {
      return isThrottling ? (
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 animate-pulse">
          ⚡ Bulk Throttled (20%)
        </span>
      ) : (
        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
          Adaptive Fair Share
        </span>
      );
    }
    if (qosMode === 'static_qos') {
      return (
        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
          RT Priority First
        </span>
      );
    }
    return (
      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
        FIFO Neutral
      </span>
    );
  };

  return (
    <div className={`px-4 py-3 rounded-2xl bg-slate-900 border transition-all shadow-xl min-w-[220px] ${queueBorder}`}>
      {/* Handles */}
      <Handle type="target" position={Position.Left} className="!bg-sky-400 !w-2.5 !h-2.5" />
      <Handle type="source" position={Position.Right} className="!bg-sky-400 !w-2.5 !h-2.5" />
      <Handle type="source" id="top" position={Position.Top} className="!bg-amber-400 !w-2.5 !h-2.5" />
      <Handle type="target" id="bottom" position={Position.Bottom} className="!bg-indigo-400 !w-2.5 !h-2.5" />

      {/* Header */}
      <div className="flex items-center justify-between gap-1 mb-2">
        <div className="flex items-center gap-1.5">
          <HardDrive className={`w-4 h-4 ${occ > 70 ? 'text-rose-400' : 'text-sky-400'}`} />
          <span className="text-xs font-bold text-slate-100">Bottleneck Buffer</span>
        </div>
        {getPolicyBadge()}
      </div>

      {/* Buffer Fill Visual Bar */}
      <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 mb-2">
        <div className="flex justify-between text-[10px] text-slate-300 mb-1">
          <span>Buffer Fill</span>
          <b className={occ > 70 ? 'text-rose-400 font-bold' : 'text-slate-200'}>{occ}%</b>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
          <div 
            className={`h-full bg-gradient-to-r ${fillGradient} transition-all duration-300`}
            style={{ width: `${Math.min(100, occ)}%` }}
          />
        </div>
        <div className="flex justify-between text-[9px] text-slate-400 mt-1">
          <span>{occBytes} KB queued</span>
          <span>{capBytes} KB max</span>
        </div>
      </div>

      {/* Drops Indicator */}
      <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-800">
        <span className="text-slate-400">Tail Drops:</span>
        {drops > 0 ? (
          <span className="font-bold text-rose-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {drops} dropped
          </span>
        ) : (
          <span className="text-emerald-400 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> 0 dropped
          </span>
        )}
      </div>
    </div>
  );
}

// 4. Target Destination Server Node
function ServerNode({ data }) {
  const throughput = data.details?.delivered_throughput_mbps || 0;
  const delivered = data.details?.total_delivered_packets || 0;
  const latency = data.details?.avg_latency_ms || 5.0;

  return (
    <div className="px-4 py-3 rounded-2xl bg-slate-900 border border-emerald-500/40 shadow-xl min-w-[200px]">
      <Handle type="target" position={Position.Left} className="!bg-emerald-400 !w-2.5 !h-2.5" />

      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400">
            <Server className="w-4 h-4" />
          </div>
          <div className="text-left">
            <div className="text-xs font-bold text-slate-100">Destination Server</div>
            <div className="text-[10px] text-slate-400">Internet / WAN Egress</div>
          </div>
        </div>
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
      </div>

      <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800 space-y-1 text-[10px]">
        <div className="flex justify-between">
          <span className="text-slate-400">Throughput:</span>
          <b className="text-emerald-300 font-bold">{throughput} Mbps</b>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Total Delivered:</span>
          <span className="font-semibold text-slate-200">{delivered.toLocaleString()} pkts</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">End-to-End Delay:</span>
          <span className={`font-semibold ${latency > 40 ? 'text-amber-400' : 'text-emerald-400'}`}>{latency} ms</span>
        </div>
      </div>
    </div>
  );
}

// 5. Monitor Node
function MonitorNode({ data }) {
  const state = data.details?.state || 'normal';
  let badgeColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  if (state === 'congested') badgeColor = 'bg-rose-500/20 text-rose-400 border-rose-500/30 animate-pulse';
  else if (state === 'warning') badgeColor = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  else if (state === 'recovering') badgeColor = 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';

  return (
    <div className="px-3.5 py-2.5 rounded-xl bg-slate-900/95 border border-amber-500/40 shadow-xl text-center min-w-[190px]">
      <Handle type="target" position={Position.Bottom} className="!bg-amber-400 !w-2.5 !h-2.5" />
      <div className="flex items-center justify-between gap-1 mb-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>Congestion Detector</span>
        </div>
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${badgeColor}`}>
          {state}
        </span>
      </div>
      <div className="text-[10px] text-slate-400 text-left pt-1 border-t border-slate-800 flex justify-between">
        <span>Events Triggered:</span>
        <b className="text-amber-300">{data.details?.events_detected || 0}</b>
      </div>
    </div>
  );
}

// 6. Controller Node
function ControllerNode({ data }) {
  const isThrottling = data.details?.is_throttling;
  return (
    <div className="px-3.5 py-2.5 rounded-xl bg-slate-900/95 border border-indigo-500/40 shadow-xl text-center min-w-[190px]">
      <Handle type="source" position={Position.Top} className="!bg-indigo-400 !w-2.5 !h-2.5" />
      <div className="flex items-center justify-between gap-1 mb-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-400">
          <Cpu className="w-4 h-4 shrink-0" />
          <span>QoS Policy Controller</span>
        </div>
      </div>
      <div className="text-[10px] text-slate-300 text-left pt-1 border-t border-slate-800 space-y-0.5">
        <div className="flex justify-between">
          <span className="text-slate-400">Mode:</span>
          <b className="text-indigo-300">{data.details?.qos_mode}</b>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Bulk Rate Limit:</span>
          <b className={isThrottling ? 'text-amber-400 font-bold' : 'text-slate-300'}>
            {data.details?.bulk_rate_limit || '100%'}
          </b>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// CUSTOM ANIMATED TRAFFIC EDGE
// ==========================================
function PacketFlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  label
}) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 16,
  });

  const isControlOrTelemetry = data?.edge_type === 'telemetry' || data?.edge_type === 'control';
  const throughput = data?.throughput_mbps || 0;
  const isCongested = data?.is_congested;
  const cat = data?.traffic_category || 'best_effort';
  const isAnimated = data?.animated && throughput > 0;

  // Particle color based on traffic category
  let particleColor = '#38bdf8'; // Sky for Best-Effort
  let strokeColor = '#38bdf8';
  if (cat === 'real_time') {
    particleColor = '#f59e0b'; // Amber for Real-Time
    strokeColor = '#f59e0b';
  } else if (cat === 'bulk') {
    particleColor = '#a855f7'; // Purple for Bulk
    strokeColor = '#a855f7';
  }

  if (data?.edge_type === 'buffer_ingress' || data?.edge_type === 'wan_egress') {
    particleColor = isCongested ? '#f43f5e' : '#38bdf8';
    strokeColor = isCongested ? '#f43f5e' : '#0284c7';
  }

  // Animation duration: higher throughput = faster flow
  const durationSec = Math.max(0.7, Math.min(2.4, 12.0 / Math.max(1, throughput))) + 's';

  if (isControlOrTelemetry) {
    const isControl = data?.edge_type === 'control';
    return (
      <>
        <BaseEdge 
          path={edgePath} 
          style={{ 
            stroke: isControl ? '#818cf8' : '#f59e0b', 
            strokeDasharray: '4 4', 
            strokeWidth: 1.5,
            opacity: 0.7 
          }} 
        />
        {label && (
          <EdgeLabelRenderer>
            <div
              style={{
                position: 'absolute',
                transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                pointerEvents: 'all',
              }}
              className={`px-1.5 py-0.5 rounded text-[8px] font-semibold border ${
                isControl ? 'bg-slate-900/90 text-indigo-300 border-indigo-500/30' : 'bg-slate-900/90 text-amber-300 border-amber-500/30'
              }`}
            >
              {label}
            </div>
          </EdgeLabelRenderer>
        )}
      </>
    );
  }

  return (
    <>
      <BaseEdge 
        path={edgePath} 
        style={{ 
          stroke: isCongested ? '#f43f5e' : strokeColor, 
          strokeWidth: isCongested ? 3 : 2,
          opacity: 0.65 
        }} 
      />

      {/* SVG Native Moving Packet Particles */}
      {isAnimated && (
        <>
          <circle r="3.5" fill={particleColor}>
            <animateMotion
              dur={durationSec}
              repeatCount="indefinite"
              path={edgePath}
            />
          </circle>
          {throughput > 10 && (
            <circle r="3.5" fill={particleColor}>
              <animateMotion
                dur={durationSec}
                begin="0.5s"
                repeatCount="indefinite"
                path={edgePath}
              />
            </circle>
          )}
        </>
      )}

      {/* Edge Label Pill */}
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className={`px-2 py-0.5 rounded-md text-[9px] font-bold border shadow-md backdrop-blur-sm ${
              isCongested 
                ? 'bg-rose-950/90 text-rose-300 border-rose-500/40' 
                : 'bg-slate-900/90 text-slate-300 border-slate-700'
            }`}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

// ==========================================
// MAIN TOPOLOGY CANVAS
// ==========================================
export function TopologyCanvas({ topology, onSelectNode }) {
  const nodeTypes = useMemo(() => ({
    router: RouterNode,
    queue: QueueNode,
    server: ServerNode,
    client: ClientNode,
    monitor: MonitorNode,
    controller: ControllerNode,
  }), []);

  const edgeTypes = useMemo(() => ({
    packetFlow: PacketFlowEdge,
  }), []);

  if (!topology || !topology.nodes) {
    return (
      <div className="h-[540px] flex items-center justify-center bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400 text-sm">
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
    type: 'packetFlow',
    data: {
      traffic_category: e.traffic_category,
      edge_type: e.edge_type,
      throughput_mbps: e.throughput_mbps,
      offered_load_mbps: e.offered_load_mbps,
      is_bursting: e.is_bursting,
      packet_loss_pct: e.packet_loss_pct,
      is_congested: e.is_congested,
      animated: e.animated,
    },
  }));

  return (
    <div className="relative h-[560px] w-full rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl">
      {/* Legend Banner */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-3 bg-slate-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-800 text-xs shadow-lg">
        <span className="font-semibold text-slate-300">Traffic Types:</span>
        <span className="flex items-center gap-1.5 text-amber-400 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Real-Time (Video/Voice)
        </span>
        <span className="flex items-center gap-1.5 text-sky-400 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span> Best-Effort (Web)
        </span>
        <span className="flex items-center gap-1.5 text-purple-400 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span> Bulk (File Download)
        </span>
        <span className="h-3 w-px bg-slate-700" />
        <span className="flex items-center gap-1 text-slate-400 text-[11px]">
          <span className="w-2 h-0.5 bg-amber-400 border-b border-dashed" /> Telemetry
        </span>
        <span className="flex items-center gap-1 text-slate-400 text-[11px]">
          <span className="w-2 h-0.5 bg-indigo-400 border-b border-dashed" /> QoS Control
        </span>
      </div>

      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
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
