import React from 'react';
import { Cpu, ShieldCheck, ArrowRight, Clock, Sliders, CheckCircle } from 'lucide-react';
import { AdaptiveDecisionPanel } from './AdaptiveDecisionPanel';

export function QoSSection({ qosStatus, qosHistory, config, status }) {
  const mode = qosStatus?.qos_mode || 'baseline';
  const activePolicy = qosStatus?.active_policy || 'FIFO Neutral';
  const isThrottling = qosStatus?.is_throttling_bulk;

  return (
    <div className="space-y-6">
      {/* Real-Time Adaptive Decision Panel */}
      <AdaptiveDecisionPanel
        decision={qosStatus?.latest_decision || status?.latest_decision}
        qosStatus={qosStatus}
        config={config}
        status={status}
      />

      {/* Current Controller State Card */}
      <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-indigo-400" />
              Traffic Priority Controller
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              How the router is currently managing which packets get sent first.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Mode: {mode.toUpperCase()}
            </span>
            {isThrottling && (
              <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
                Bulk Traffic Capped (20%)
              </span>
            )}
          </div>
        </div>

        {/* Current policy banner */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Active Rule:</div>
            <div className="text-sm font-bold text-sky-400 mt-0.5">{activePolicy}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-slate-400">Policy Changes:</div>
            <div className="text-sm font-bold text-slate-200">{qosStatus?.transitions_count || 0}</div>
          </div>
        </div>

        {/* Parameters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <div className="text-xs text-slate-400">Downloads limited to</div>
            <div className="text-lg font-bold text-indigo-400 mt-1">
              {Math.round((config?.adaptive_bulk_rate_limit_ratio || 0.2) * 100)}% of bandwidth
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">When congested, downloads are capped so video/voice calls stay smooth.</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <div className="text-xs text-slate-400">Recovery confirmation time</div>
            <div className="text-lg font-bold text-cyan-400 mt-1">
              {config?.adaptive_recovery_steps || 10} steps ({(config?.adaptive_recovery_steps || 10) * (config?.time_step_seconds || 0.1)}s)
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">How long the network must stay uncongested before switching back to normal.</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <div className="text-xs text-slate-400">Flip-flop prevention</div>
            <div className="text-lg font-bold text-emerald-400 mt-1">
              {config?.adaptive_cooldown_steps || 15} steps ({(config?.adaptive_cooldown_steps || 15) * (config?.time_step_seconds || 0.1)}s)
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Cooldown period after a policy change to prevent it from switching back and forth rapidly.</div>
          </div>
        </div>
      </div>

      {/* QoS Transition Log Table */}
      <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-6 shadow-xl">
        <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 mb-1">
          <Clock className="w-5 h-5 text-indigo-400" />
          Policy Change History
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          A log of every time the Smart Priority controller switched strategies during the simulation.
        </p>

        {(!qosHistory || qosHistory.length === 0) ? (
          <div className="p-6 text-center text-slate-400 text-xs border border-dashed border-slate-800 rounded-xl">
            No policy changes yet. Enable <b>Smart Priority (Adaptive)</b> and run Heavy Traffic to see it in action.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/60 text-slate-400 uppercase text-[10px] font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Previous Strategy</th>
                  <th className="py-2.5 px-3">New Strategy</th>
                  <th className="py-2.5 px-3">Why It Changed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {qosHistory.map((tr, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-mono text-sky-400">{tr.simulated_time_sec}s</td>
                    <td className="py-2.5 px-3 text-slate-400">{tr.previous_policy}</td>
                    <td className="py-2.5 px-3 text-emerald-400 font-semibold">{tr.new_policy}</td>
                    <td className="py-2.5 px-3 text-slate-400">{tr.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
