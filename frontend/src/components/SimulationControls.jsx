import React, { useState } from 'react';
import { 
  Sliders, 
  Zap, 
  RotateCcw, 
  Play, 
  Pause, 
  Square, 
  Layers, 
  Clock, 
  Hash, 
  HardDrive,
  Info
} from 'lucide-react';

export function SimulationControls({ config, status, isBusy, actions }) {
  const [capacity, setCapacity] = useState(config?.bottleneck_capacity_mbps || 50.0);
  const [duration, setDuration] = useState(config?.duration_seconds || 30.0);
  const [seed, setSeed] = useState(config?.random_seed || 42);
  const [queueBytes, setQueueBytes] = useState(config?.queue_capacity_bytes || 500000);
  const [activePreset, setActivePreset] = useState('high');

  const isRunning = status?.is_running;
  const isPaused = status?.is_paused;
  const qosMode = config?.qos_mode || 'baseline';

  const presets = [
    {
      id: 'low',
      name: 'Low Load',
      load: '~20 Mbps',
      desc: '3 flows (1 RT, 1 BE, 1 Bulk). Clean link, zero bufferbloat, no drops.',
      badge: 'Uncongested',
      badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    },
    {
      id: 'medium',
      name: 'Medium Load',
      load: '~45 Mbps',
      desc: '4 flows. Approaching 90% link capacity. Slight queue buildup.',
      badge: 'Near Capacity',
      badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    },
    {
      id: 'high',
      name: 'High Load',
      load: '~82 Mbps',
      desc: '6 flows (>160% link capacity). Heavy congestion, queue saturation & drops!',
      badge: 'Severe Overload',
      badgeColor: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
    },
  ];

  const handleApplyConfig = () => {
    actions.updateConfig({
      bottleneck_capacity_mbps: parseFloat(capacity),
      duration_seconds: parseFloat(duration),
      random_seed: parseInt(seed, 10),
      queue_capacity_bytes: parseInt(queueBytes, 10),
    });
  };

  const handlePresetSelect = (pId) => {
    setActivePreset(pId);
    actions.setPreset(pId, qosMode);
  };

  return (
    <div className="space-y-6">
      {/* Quick Traffic Presets Card */}
      <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              Traffic Workload Presets
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Presets inject deterministic traffic matrices into the virtual AP link.
            </p>
          </div>
          <span className="text-[11px] font-semibold text-slate-400 px-2.5 py-1 bg-slate-800 rounded-lg border border-slate-700">
            Current Workload: {activePreset.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {presets.map((p) => {
            const isSelected = activePreset === p.id;
            return (
              <button
                key={p.id}
                onClick={() => handlePresetSelect(p.id)}
                disabled={isBusy || isRunning}
                className={`text-left p-4 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-sky-500/10 border-sky-500/60 shadow-lg shadow-sky-500/10 ring-1 ring-sky-500/40'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                } disabled:opacity-50`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-sm text-slate-100">{p.name}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${p.badgeColor}`}>
                    {p.badge}
                  </span>
                </div>
                <div className="text-xs font-semibold text-sky-400 mb-1">Offered Load: {p.load}</div>
                <p className="text-xs text-slate-400 leading-relaxed">{p.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* QoS Scheduling Mode Selection */}
      <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-6 shadow-xl">
        <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 mb-1">
          <Layers className="w-5 h-5 text-indigo-400" />
          QoS Scheduling Strategy
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Choose the active packet scheduling algorithm implemented in the simulation engine.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => actions.setQoSMode('baseline')}
            disabled={isBusy || isRunning}
            className={`text-left p-4 rounded-xl border transition-all ${
              qosMode === 'baseline'
                ? 'bg-slate-800/90 border-slate-500 shadow-md ring-1 ring-slate-400/40'
                : 'bg-slate-900 border-slate-800 hover:border-slate-700'
            } disabled:opacity-50`}
          >
            <div className="font-bold text-sm text-slate-100 mb-1">Mode A: Baseline FIFO</div>
            <div className="text-xs text-slate-400 mb-2 font-medium">First-In First-Out Queue</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Neutral scheduling without class prioritization. Under heavy load, bulk traffic causes bufferbloat and high tail-drop loss for video/voice.
            </p>
          </button>

          <button
            onClick={() => actions.setQoSMode('static_qos')}
            disabled={isBusy || isRunning}
            className={`text-left p-4 rounded-xl border transition-all ${
              qosMode === 'static_qos'
                ? 'bg-sky-500/10 border-sky-500/60 shadow-lg shadow-sky-500/10 ring-1 ring-sky-500/40'
                : 'bg-slate-900 border-slate-800 hover:border-slate-700'
            } disabled:opacity-50`}
          >
            <div className="font-bold text-sm text-slate-100 mb-1">Mode B: Static QoS</div>
            <div className="text-xs text-sky-400 mb-2 font-medium">Strict Priority Queueing</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Strict priority service (Real-Time &gt; Best-Effort &gt; Bulk). Protects video latency continuously by always evacuating high-priority queues first.
            </p>
          </button>

          <button
            onClick={() => actions.setQoSMode('adaptive_qos')}
            disabled={isBusy || isRunning}
            className={`text-left p-4 rounded-xl border transition-all ${
              qosMode === 'adaptive_qos'
                ? 'bg-indigo-500/10 border-indigo-500/60 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/40'
                : 'bg-slate-900 border-slate-800 hover:border-slate-700'
            } disabled:opacity-50`}
          >
            <div className="font-bold text-sm text-slate-100 mb-1">Mode C: Adaptive QoS</div>
            <div className="text-xs text-indigo-400 mb-2 font-medium">Congestion-Feedback Controller</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Monitors queue depth, utilization &amp; delay. Dynamically caps bulk share to 20% during congestion, with hysteresis recovery &amp; cooldown timers.
            </p>
          </button>
        </div>
      </div>

      {/* Network Parameters & Sliders */}
      <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-6 shadow-xl">
        <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 mb-4">
          <Sliders className="w-5 h-5 text-sky-400" />
          Network Topology Parameters
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Capacity Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-300">Shared Bottleneck Capacity</span>
              <span className="font-bold text-sky-400">{capacity} Mbps</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              disabled={isRunning}
              className="w-full accent-sky-500 bg-slate-800 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>10 Mbps (Severe bottleneck)</span>
              <span>100 Mbps (High bandwidth)</span>
            </div>
          </div>

          {/* Buffer Capacity Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-300">Queue Buffer Limit</span>
              <span className="font-bold text-emerald-400">{Math.round(queueBytes / 1000)} KB</span>
            </div>
            <input
              type="range"
              min="50000"
              max="1000000"
              step="25000"
              value={queueBytes}
              onChange={(e) => setQueueBytes(e.target.value)}
              disabled={isRunning}
              className="w-full accent-emerald-500 bg-slate-800 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>50 KB (Frequent drops)</span>
              <span>1000 KB (High bufferbloat)</span>
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-300">Simulation Duration</span>
              <span className="font-bold text-amber-400">{duration} Seconds</span>
            </div>
            <input
              type="range"
              min="10"
              max="120"
              step="5"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              disabled={isRunning}
              className="w-full accent-amber-500 bg-slate-800 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>10s (Quick test)</span>
              <span>120s (Extended observation)</span>
            </div>
          </div>

          {/* Seed Input */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-300">PRNG Seed (Deterministic Repeatability)</span>
              <span className="font-bold text-indigo-400">Seed: {seed}</span>
            </div>
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              disabled={isRunning}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs font-mono"
            />
            <span className="text-[10px] text-slate-400">Exact seed guarantees reproducible packet arrival timestamps.</span>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={handleApplyConfig}
            disabled={isBusy || isRunning}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-600/20 transition-all disabled:opacity-50"
          >
            Apply Configuration Changes
          </button>
        </div>
      </div>
    </div>
  );
}
