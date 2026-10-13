import React from 'react';
import { 
  Info, 
  AlertTriangle, 
  ShieldCheck, 
  Activity, 
  Zap, 
  HelpCircle,
  Layers,
  ArrowRight
} from 'lucide-react';

export function WhatIsHappeningPanel({ status, config, qosStatus, events }) {
  const state = status?.congestion_state || 'normal';
  const qosMode = status?.qos_mode || 'baseline';
  const latest = status?.latest_metrics;
  const linkCapacity = config?.bottleneck_capacity_mbps || 50.0;
  const isThrottling = qosStatus?.is_throttling_bulk;

  const offeredLoad = latest ? Number(latest.offered_load_mbps).toFixed(1) : '0.0';
  const deliveredThroughput = latest ? Number(latest.delivered_throughput_mbps).toFixed(1) : '0.0';
  const queueOcc = latest ? Math.round(latest.queue_occupancy_pct) : 0;
  const queueBytes = latest ? Math.round(latest.queue_occupancy_bytes / 1000) : 0;
  const latency = latest ? Number(latest.avg_latency_ms).toFixed(1) : '5.0';
  const loss = latest ? Number(latest.packet_loss_pct).toFixed(1) : '0.0';
  const droppedPkts = latest ? latest.total_packets_dropped : 0;

  // Determine state styling and headline
  let theme = {
    bg: 'bg-emerald-500/5 border-emerald-500/20',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    badgeText: 'Normal Operation',
    icon: ShieldCheck,
    headline: 'The network has enough capacity for the current traffic.',
    colorText: 'text-emerald-400',
  };

  if (state === 'congested') {
    if (qosMode === 'adaptive_qos' && isThrottling) {
      theme = {
        bg: 'bg-indigo-500/10 border-indigo-500/30 ring-1 ring-indigo-500/20',
        badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
        badgeText: 'Optimization Active',
        icon: Zap,
        headline: 'Adaptive QoS has changed traffic management to protect latency-sensitive applications.',
        colorText: 'text-indigo-400',
      };
    } else {
      theme = {
        bg: 'bg-rose-500/10 border-rose-500/30 ring-1 ring-rose-500/20',
        badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
        badgeText: 'Congestion Detected',
        icon: AlertTriangle,
        headline: 'Traffic is arriving faster than the network can transmit it. Packets are waiting in the queue, increasing latency.',
        colorText: 'text-rose-400',
      };
    }
  } else if (state === 'warning') {
    theme = {
      bg: 'bg-amber-500/10 border-amber-500/30 ring-1 ring-amber-500/20',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      badgeText: 'High Load Warning',
      icon: AlertTriangle,
      headline: 'Network demand is approaching the available capacity.',
      colorText: 'text-amber-400',
    };
  } else if (state === 'recovering') {
    theme = {
      bg: 'bg-cyan-500/10 border-cyan-500/30 ring-1 ring-cyan-500/20',
      badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      badgeText: 'Recovery Phase',
      icon: Activity,
      headline: 'Queue occupancy and latency have decreased. Check the metrics to verify the improvement.',
      colorText: 'text-cyan-400',
    };
  }

  const Icon = theme.icon;

  // Determine explanation of why congestion occurred
  const getDetectionReason = () => {
    if (state === 'congested') {
      return `Traffic arrival rate (${offeredLoad} Mbps) exceeds the Wi-Fi bottleneck capacity (${linkCapacity} Mbps). The router buffer is ${queueOcc}% full (${queueBytes} KB queued), pushing average delay up to ${latency} ms${Number(loss) > 0 ? ` and causing ${loss}% packet loss (${droppedPkts} dropped packets)` : ''}.`;
    }
    if (state === 'warning') {
      return `Offered traffic (${offeredLoad} Mbps) is consuming ${latest?.link_utilization_pct || 0}% of the link. The queue has filled to ${queueOcc}% capacity.`;
    }
    if (state === 'recovering') {
      return `Traffic arrivals have subsided below the bottleneck threshold. The buffer has drained to ${queueOcc}% and latency has normalized to ${latency} ms. Sustaining stability check.`;
    }
    return `Traffic demand (${offeredLoad} Mbps) is well within the ${linkCapacity} Mbps link speed. Packets pass through the router immediately with minimal delay (${latency} ms).`;
  };

  // Determine corrective action taken
  const getActionTaken = () => {
    if (qosMode === 'adaptive_qos') {
      if (isThrottling) {
        return `Dynamic rate limiting is actively throttling bulk downloads to 20% and clamping bulk buffer occupancy. This prevents bufferbloat and guarantees real-time video/voice packets get through with low latency.`;
      }
      return `Adaptive controller is in standard monitoring state. All client traffic classes are transmitting at full fair share without artificial limits.`;
    }
    if (qosMode === 'static_qos') {
      return `Static QoS strict priority is active. Real-Time packets (Zoom / VoIP) are scheduled first out of priority queues ahead of best-effort web traffic and bulk file transfers.`;
    }
    return `Default FIFO (First-Come, First-Served) is active. No priority or rate limiting is applied. When the buffer fills up, packets from all devices are dropped equally.`;
  };

  return (
    <div className={`p-4 sm:p-5 rounded-2xl border transition-all shadow-xl ${theme.bg}`}>
      {/* Top Banner Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-xl bg-slate-900/60 border border-slate-800 ${theme.colorText}`}>
            <Icon className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                What is happening right now?
              </span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${theme.badge}`}>
                {theme.badgeText}
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-100 mt-0.5">
              {theme.headline}
            </h3>
          </div>
        </div>

        {/* Live Status Summary Pill */}
        <div className="flex items-center gap-2 text-[11px] font-mono bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800 text-slate-300">
          <span>Load: <b className="text-slate-100">{offeredLoad}</b>M</span>
          <span className="text-slate-600">/</span>
          <span>Delivered: <b className="text-sky-300">{deliveredThroughput}</b>M</span>
          <span className="text-slate-600">|</span>
          <span>Queue: <b className={queueOcc > 70 ? 'text-rose-400' : 'text-slate-100'}>{queueOcc}%</b></span>
          <span className="text-slate-600">|</span>
          <span>Delay: <b className={Number(latency) > 40 ? 'text-amber-400' : 'text-emerald-400'}>{latency}ms</b></span>
        </div>
      </div>

      {/* Explanations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-800/80 text-xs">
        {/* Why detected */}
        <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/60">
          <div className="flex items-center gap-1.5 font-bold text-slate-300 mb-1">
            <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
            <span>Why is this happening?</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            {getDetectionReason()}
          </p>
        </div>

        {/* Action taken */}
        <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/60">
          <div className="flex items-center gap-1.5 font-bold text-slate-300 mb-1">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>Traffic Management & Corrective Action</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            {getActionTaken()}
          </p>
        </div>
      </div>
    </div>
  );
}
