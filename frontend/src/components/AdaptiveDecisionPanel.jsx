import React from 'react';
import { 
  Cpu, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  ShieldCheck, 
  Sliders, 
  TrendingDown, 
  Clock, 
  Layers, 
  Check, 
  Activity 
} from 'lucide-react';

export function AdaptiveDecisionPanel({ decision, qosStatus, config, status }) {
  const dec = decision || qosStatus?.latest_decision || status?.latest_decision;
  const isAdaptive = (config?.qos_mode === 'adaptive_qos') || (qosStatus?.qos_mode === 'adaptive_qos');

  if (!dec) {
    return (
      <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-400" />
            Adaptive QoS Real-Time Decision Engine
          </h3>
          <span className="text-xs px-2.5 py-1 rounded bg-slate-800 text-slate-400 border border-slate-700">
            Awaiting Simulation Telemetry
          </span>
        </div>
        <p className="text-xs text-slate-400">
          Start the simulation with <b>Mode C: Adaptive QoS</b> under High Load to observe live closed-loop policy decisions, triggering metrics evidence, and bulk traffic allocation changes.
        </p>
      </div>
    );
  }

  const isCongested = dec.congestion_state === 'congested';
  const isWarning = dec.congestion_state === 'warning';
  const stateColor = isCongested
    ? 'text-rose-400 bg-rose-500/10 border-rose-500/30'
    : isWarning
    ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
    : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';

  const evidence = dec.trigger_evidence || {};

  return (
    <div className="rounded-2xl bg-slate-900/80 border border-indigo-500/30 p-6 shadow-2xl relative overflow-hidden backdrop-blur-sm">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
              <Cpu className="w-5 h-5" />
            </span>
            <h3 className="text-base font-bold text-slate-100">
              Adaptive QoS Closed-Loop Decision Panel
            </h3>
            {dec.action_applied_successfully && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" /> Enforced in Simulator
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Simulated discrete closed-loop controller decisions evaluated at step #{dec.step_index} ({dec.timestamp_sec}s).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-lg border ${stateColor}`}>
            State: {dec.congestion_state}
          </span>
          {dec.bulk_restriction_active && (
            <span className="text-xs font-bold px-3 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5" /> Bulk Capped ({Math.round((dec.bulk_rate_limit_ratio ?? 0.2) * 100)}%)
            </span>
          )}
        </div>
      </div>

      {/* Decision Workflow Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 my-5">
        {/* Box 1: Policy Transition */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
            Policy Transition
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs font-semibold text-slate-400 truncate max-w-[90px]">
              {dec.previous_policy || 'None'}
            </span>
            <ArrowRight className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="text-xs font-bold text-indigo-300 truncate">
              {dec.applied_policy}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-900 leading-tight">
            Reason: <span className="text-slate-300 font-medium">{dec.reason}</span>
          </div>
        </div>

        {/* Box 2: Measured Evidence (Trigger Metrics) */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">
            Measured Evidence (EWMA)
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block">Link Util:</span>
              <span className={`font-mono font-bold ${evidence.moving_avg_utilization_pct > 85 ? 'text-rose-400' : 'text-sky-400'}`}>
                {evidence.moving_avg_utilization_pct || 0}%
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Buffer Depth:</span>
              <span className={`font-mono font-bold ${evidence.moving_avg_queue_pct > 70 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {evidence.moving_avg_queue_pct || 0}%
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Avg Latency:</span>
              <span className={`font-mono font-bold ${evidence.moving_avg_latency_ms > 40 ? 'text-amber-400' : 'text-slate-200'}`}>
                {evidence.moving_avg_latency_ms || 0} ms
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Loss Rate:</span>
              <span className={`font-mono font-bold ${evidence.moving_avg_packet_loss_pct > 0 ? 'text-rose-400' : 'text-slate-200'}`}>
                {evidence.moving_avg_packet_loss_pct || 0}%
              </span>
            </div>
          </div>
        </div>

        {/* Box 3: Service Allocation */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
            Service Allocation Rule
          </div>
          <div className="space-y-1.5 mt-2 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-amber-400 font-semibold">Real-Time:</span>
              <span className="text-slate-300 font-mono text-[10px]">Strict Priority (0 queue wait)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sky-400 font-semibold">Best-Effort:</span>
              <span className="text-slate-300 font-mono text-[10px]">Medium Priority</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-purple-400 font-semibold">Bulk Transfer:</span>
              <span className="text-rose-300 font-mono text-[10px] font-bold">
                {dec.bulk_restriction_active ? 'Capped at 20%' : 'Fair share (25%)'}
              </span>
            </div>
          </div>
        </div>

        {/* Box 4: Recovery & Hysteresis */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
            Recovery & Cooldown
          </div>
          <div className="text-xs text-slate-300 font-medium mt-1">
            {dec.recovery_status || 'Tracking health...'}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Req: {dec.recovery_condition}
          </div>
          <div className="mt-2 pt-1.5 border-t border-slate-900 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Anti-Oscillation:</span>
            <span className="font-mono text-cyan-400 font-semibold">{dec.cooldown_status}</span>
          </div>
        </div>
      </div>

      {/* Affected Flows & Classes Footer */}
      <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">Affected Traffic Classes:</span>
          <div className="flex items-center gap-1.5">
            {dec.affected_classes?.map((c) => (
              <span key={c} className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono uppercase">
                {c.replace('_', ' ')}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">Contending Flows:</span>
          <span className="text-slate-300 font-mono text-xs">
            {dec.affected_flows?.length || 0} active flows governed
          </span>
        </div>
      </div>
    </div>
  );
}
