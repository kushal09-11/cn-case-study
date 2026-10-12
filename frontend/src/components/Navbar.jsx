import React from 'react';
import { 
  Wifi, 
  Play, 
  Pause, 
  RotateCcw, 
  Square, 
  Activity, 
  ShieldCheck, 
  AlertTriangle,
  Server,
  Sliders,
  BarChart3,
  GitCompare,
  Database,
  Cpu,
  Sparkles
} from 'lucide-react';

export function Navbar({ 
  activeTab, 
  setActiveTab, 
  status, 
  isConnected, 
  isBusy, 
  actions 
}) {
  const isRunning = status?.is_running;
  const isPaused = status?.is_paused;
  const isCompleted = status?.is_completed;
  const state = status?.congestion_state || 'normal';
  const qosMode = status?.qos_mode || 'baseline';

  const getStateBadge = () => {
    switch (state) {
      case 'congested':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse"><AlertTriangle className="w-3.5 h-3.5" /> Network Congested</span>;
      case 'warning':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/40"><AlertTriangle className="w-3.5 h-3.5" /> High Load Warning</span>;
      case 'recovering':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"><Activity className="w-3.5 h-3.5" /> Recovering…</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"><ShieldCheck className="w-3.5 h-3.5" /> All Good</span>;
    }
  };

  const getQoSBadge = () => {
    switch (qosMode) {
      case 'adaptive_qos':
        return <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Smart Priority (Adaptive)</span>;
      case 'static_qos':
        return <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/30">Fixed Priority</span>;
      default:
        return <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-700/50 text-slate-300 border border-slate-600/50">No Priority (Default)</span>;
    }
  };

  const navItems = [
    { id: 'overview', label: 'Dashboard', icon: Activity },
    { id: 'topology', label: 'Network Map', icon: Server },
    { id: 'controls', label: 'Settings', icon: Sliders },
    { id: 'analytics', label: 'Charts', icon: BarChart3 },
    { id: 'congestion', label: 'Congestion Alerts', icon: AlertTriangle },
    { id: 'qos', label: 'Traffic Priority', icon: Cpu },
    { id: 'comparison', label: 'Compare Runs', icon: GitCompare },
    { id: 'history', label: 'History', icon: Database },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/10 border border-sky-500/30 rounded-xl text-sky-400 shadow-lg shadow-sky-500/5">
              <Wifi className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-100 tracking-tight">Wi-Fi Network Simulator</h1>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  Simulation
                </span>
              </div>
              <p className="text-xs text-slate-400">See how a busy Wi-Fi network handles congestion and traffic prioritization</p>
            </div>
          </div>

          {/* Status indicators */}
          <div className="flex items-center gap-2.5">
            {getQoSBadge()}
            {getStateBadge()}

            {/* Quick Actions */}
            <div className="flex items-center gap-1.5 ml-2 pl-3 border-l border-slate-800">
              <button
                onClick={() => actions.newScenario()}
                disabled={isBusy || isRunning}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600/90 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
                title="Generate a fresh random workload scenario with a new seed"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                New Scenario
              </button>

              {!isRunning ? (
                <button
                  onClick={isPaused ? actions.resume : actions.start}
                  disabled={isBusy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
                  title="Run Simulation"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  {isPaused ? 'Resume' : 'Start'}
                </button>
              ) : (
                <button
                  onClick={actions.pause}
                  disabled={isBusy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/20 transition-all"
                  title="Pause Simulation"
                >
                  <Pause className="w-3.5 h-3.5" />
                  Pause
                </button>
              )}

              <button
                onClick={actions.stop}
                disabled={!isRunning && !isPaused}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-800 disabled:opacity-40 transition-all"
                title="Stop Simulation"
              >
                <Square className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={actions.reset}
                disabled={isBusy}
                className="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 border border-slate-800 transition-all"
                title="Reset to Initial State (Replay Scenario)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex items-center gap-1 mt-3 -mb-1 overflow-x-auto py-1 text-sm no-scrollbar">
          {navItems.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-medium text-xs whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-sky-400' : 'text-slate-500'}`} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
