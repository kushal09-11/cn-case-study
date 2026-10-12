import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { Activity, Clock, ShieldAlert, BarChart2 } from 'lucide-react';

export function AnalyticsCharts({ history }) {
  if (!history || history.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400 text-sm">
        No data yet. Start the simulation to see live charts.
      </div>
    );
  }

  // Format data for Recharts
  const chartData = history.map((item) => ({
    time: `${item.simulated_time_seconds}s`,
    timeSec: item.simulated_time_seconds,
    offered: item.offered_load_mbps,
    delivered: item.delivered_throughput_mbps,
    utilization: item.link_utilization_pct,
    queue: item.queue_occupancy_pct,
    avgLatency: item.avg_latency_ms,
    p95Latency: item.p95_latency_ms,
    jitter: item.jitter_ms,
    loss: item.packet_loss_pct,
    rtThroughput: item.category_throughput_mbps?.real_time || 0,
    beThroughput: item.category_throughput_mbps?.best_effort || 0,
    bulkThroughput: item.category_throughput_mbps?.bulk || 0,
  }));

  const customTooltipStyle = {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
    borderRadius: '0.75rem',
    color: '#e2e8f0',
    fontSize: '11px',
    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)',
  };

  return (
    <div className="space-y-6">
      {/* Row 1: Throughput & Latency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Throughput Chart */}
        <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Activity className="w-4 h-4 text-sky-400" />
                Traffic Demand vs. Actual Throughput
              </h4>
              <p className="text-[11px] text-slate-400">How much traffic was requested vs. how much actually got through.</p>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Unit: Mbps</span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="offeredGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="deliveredGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={customTooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Area type="monotone" dataKey="offered" name="Offered Load (Mbps)" stroke="#f59e0b" fillOpacity={1} fill="url(#offeredGrad)" />
                <Area type="monotone" dataKey="delivered" name="Delivered Throughput (Mbps)" stroke="#38bdf8" fillOpacity={1} fill="url(#deliveredGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Latency Chart */}
        <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                Packet Delay Over Time
              </h4>
              <p className="text-[11px] text-slate-400">Average delay and worst-case delay (slowest 5%) for packets traveling through the router.</p>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Unit: ms</span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={customTooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="avgLatency" name="Average Latency (ms)" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="p95Latency" name="P95 Latency (ms)" stroke="#ec4899" strokeWidth={2} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: Per-Class Throughput & Buffer Occupancy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Per-Class Throughput */}
        <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-indigo-400" />
                Bandwidth by Traffic Type
              </h4>
              <p className="text-[11px] text-slate-400">How much bandwidth each type of traffic (video/voice, web browsing, downloads) is getting.</p>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Unit: Mbps</span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={customTooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="rtThroughput" name="Real-Time (Video/Voice)" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="beThroughput" name="Best-Effort (Web)" stroke="#38bdf8" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="bulkThroughput" name="Bulk (Transfer)" stroke="#a855f7" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Packet Loss & Queue Occupancy */}
        <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                Queue Fullness &amp; Dropped Packets
              </h4>
              <p className="text-[11px] text-slate-400">How full the router's buffer is and what percentage of packets are being dropped.</p>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Unit: %</span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="queueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} domain={[0, 100]} />
                <Tooltip contentStyle={customTooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Area type="monotone" dataKey="queue" name="Queue Occupancy (%)" stroke="#6366f1" fillOpacity={1} fill="url(#queueGrad)" />
                <Line type="monotone" dataKey="loss" name="Packet Loss (%)" stroke="#f43f5e" strokeWidth={2.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
