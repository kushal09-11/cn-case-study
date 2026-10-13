import React, { useState, useEffect } from 'react';
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
  Info,
  Sparkles,
  Dices,
  RefreshCw
} from 'lucide-react';

export function SimulationControls({ config, status, isBusy, actions }) {
  const [capacity, setCapacity] = useState(config?.bottleneck_capacity_mbps || 50.0);
  const [duration, setDuration] = useState(config?.duration_seconds || 30.0);
  const [seed, setSeed] = useState(config?.random_seed || 42);
  const [customSeedInput, setCustomSeedInput] = useState('');
  const [queueBytes, setQueueBytes] = useState(config?.queue_capacity_bytes || 500000);
<<<<<<< HEAD
  const [activePreset, setActivePreset] = useState(config?.preset_name || 'high');

  // Sync with incoming backend config
  React.useEffect(() => {
    if (config) {
      if (config.bottleneck_capacity_mbps) setCapacity(config.bottleneck_capacity_mbps);
      if (config.duration_seconds) setDuration(config.duration_seconds);
      if (config.random_seed) setSeed(config.random_seed);
      if (config.queue_capacity_bytes) setQueueBytes(config.queue_capacity_bytes);
      if (config.preset_name) setActivePreset(config.preset_name);
    }
  }, [config]);
=======
  const [activePreset, setActivePreset] = useState('random');

  useEffect(() => {
    if (config?.random_seed) {
      setSeed(config.random_seed);
    }
  }, [config?.random_seed]);
>>>>>>> origin/topologyimproved

  const isRunning = status?.is_running;
  const isPaused = status?.is_paused;
  const qosMode = config?.qos_mode || 'baseline';
  const totalOffered = Math.round(config?.flows?.reduce((acc, f) => acc + (f.offered_load_mbps || 0), 0) || 0);

  const presets = [
    {
      id: 'low',
<<<<<<< HEAD
      name: 'Low Load',
      load: '20.0 Mbps',
      desc: '3 flows (1 RT @ 6M, 1 BE @ 8M, 1 Bulk @ 6M). 40% link load. Zero drops.',
      badge: 'Uncongested',
=======
      name: 'Low Traffic',
      load: '~20 Mbps',
      desc: '3 devices sharing the network. Everything runs smoothly — no congestion, no dropped packets.',
      badge: 'No Congestion',
>>>>>>> origin/topologyimproved
      badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    },
    {
      id: 'medium',
<<<<<<< HEAD
      name: 'Medium Load',
      load: '45.0 Mbps',
      desc: '4 flows (1 RT @ 6M, 2 BE @ 15M+10M, 1 Bulk @ 14M). 90% load. Light queue buildup.',
      badge: 'Near Capacity',
=======
      name: 'Medium Traffic',
      load: '~45 Mbps',
      desc: '4 devices. Network is nearly full (≈90% capacity). You may see slight delays building up.',
      badge: 'Near Full',
>>>>>>> origin/topologyimproved
      badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    },
    {
      id: 'high',
<<<<<<< HEAD
      name: 'High Load',
      load: '82.0 Mbps',
      desc: '6 flows (2 RT @ 12M, 2 BE @ 30M, 2 Bulk @ 40M). 164% load. Severe congestion & drops!',
      badge: 'Severe Overload',
=======
      name: 'Heavy Traffic',
      load: '~82 Mbps',
      desc: '6 devices pushing way more than the network can handle. Expect high delays and dropped packets!',
      badge: 'Severely Overloaded',
>>>>>>> origin/topologyimproved
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

  const handleLoadCustomSeed = () => {
    const s = parseInt(customSeedInput, 10);
    if (!isNaN(s)) {
      actions.newScenario(s);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Dynamic Random Scenario Generator Card */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900/80 to-slate-900 border border-indigo-500/30 p-6 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300">
                <Sparkles className="w-5 h-5 text-indigo-400" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  Random Scenario Generator & Fair Reproducibility
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Every new simulation generates a random workload (active devices, arrival patterns, bursts, and congestion). Replaying the same seed reproduces the exact identical workload.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-indigo-500/30 text-xs font-mono">
            <span className="text-slate-400">Current Seed:</span>
            <b className="text-indigo-300">#{config?.random_seed || seed}</b>
          </div>
        </div>

        {/* Scenario Summary Pills */}
        <div className="flex flex-wrap items-center gap-2.5 mb-5 text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 font-medium">
            Devices: <b className="text-sky-300">{config?.flows?.length || 0} Clients</b>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 font-medium">
            Total Demand: <b className="text-amber-300">~{totalOffered} Mbps</b>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 font-medium">
            Link Speed: <b className="text-indigo-300">{config?.bottleneck_capacity_mbps || 50} Mbps</b>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 font-medium">
            Duration: <b className="text-slate-200">{config?.duration_seconds || 30}s</b>
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => actions.newScenario()}
              disabled={isBusy || isRunning}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-indigo-200" />
              Generate New Scenario
            </button>

            <button
              onClick={actions.reset}
              disabled={isBusy}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all disabled:opacity-50"
              title="Reset simulation to time 0 and replay the exact same scenario"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              Replay This Scenario
            </button>
          </div>

          {/* Load Custom Seed */}
          <div className="flex items-center gap-1.5 text-xs">
            <input
              type="number"
              placeholder="Custom Seed #"
              value={customSeedInput}
              onChange={(e) => setCustomSeedInput(e.target.value)}
              disabled={isBusy || isRunning}
              className="w-32 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 disabled:opacity-50 font-mono"
            />
            <button
              onClick={handleLoadCustomSeed}
              disabled={isBusy || isRunning || !customSeedInput}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 disabled:opacity-50 transition-all"
            >
              Load Seed
            </button>
          </div>
        </div>
      </div>

      {/* 2. Fixed Benchmark Traffic Presets Card */}
      <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              Or Choose a Fixed Traffic Preset
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Standard reproducible benchmark configurations for quick baseline testing.
            </p>
          </div>
          <span className="text-[11px] font-semibold text-slate-400 px-2.5 py-1 bg-slate-800 rounded-lg border border-slate-700">
            Active: {activePreset.toUpperCase()}
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
          How Should the Network Handle Congestion?
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Choose a traffic management strategy. This determines how the router decides which packets to send first when the network is busy.
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
            <div className="font-bold text-sm text-slate-100 mb-1">No Priority (Default)</div>
            <div className="text-xs text-slate-400 mb-2 font-medium">First-Come, First-Served</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every packet waits in one line regardless of type. Under heavy load, a big file download can slow down your video call.
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
            <div className="font-bold text-sm text-slate-100 mb-1">Fixed Priority</div>
            <div className="text-xs text-sky-400 mb-2 font-medium">Video/Voice always goes first</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Video and voice calls always get priority over web browsing and downloads — even when the network isn't busy.
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
            <div className="font-bold text-sm text-slate-100 mb-1">Smart Priority (Adaptive)</div>
            <div className="text-xs text-indigo-400 mb-2 font-medium">Automatically adjusts when congested</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Watches the network continuously. When congestion is detected, it automatically limits downloads to 20% of bandwidth to protect video/voice calls.
            </p>
          </button>
        </div>
      </div>

      {/* Network Parameters & Sliders */}
      <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-6 shadow-xl">
        <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 mb-4">
          <Sliders className="w-5 h-5 text-sky-400" />
          Advanced Settings
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Capacity Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-300">Wi-Fi Link Speed</span>
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
              <span>10 Mbps (Very slow)</span>
              <span>100 Mbps (Fast)</span>
            </div>
          </div>

          {/* Buffer Capacity Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-300">Router Queue Size</span>
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
              <span>50 KB (Drops packets quickly)</span>
              <span>1000 KB (Large buffer, more delay)</span>
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-300">Simulation Length</span>
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
              <span>120s (Longer observation)</span>
            </div>
          </div>

          {/* Seed Input */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-300">Random Seed</span>
              <span className="font-bold text-indigo-400">Seed: {seed}</span>
            </div>
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              disabled={isRunning}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs font-mono"
            />
            <span className="text-[10px] text-slate-400">Same seed = same simulation results every time. Change it to get different random traffic patterns.</span>
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
