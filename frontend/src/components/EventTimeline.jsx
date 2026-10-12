import React, { useMemo } from 'react';
import { Clock, ShieldAlert, Cpu, ArrowRight, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';

export function EventTimeline({ congestionEvents = [], qosTransitions = [] }) {
  // Combine both sources and sort chronologically
  const unifiedEvents = useMemo(() => {
    const list = [];

    congestionEvents.forEach((ce, idx) => {
      list.push({
        id: `cong_${idx}_${ce.simulated_time_sec}`,
        time: ce.simulated_time_sec,
        type: 'congestion',
        title: `Congestion State: ${ce.previous_state} → ${ce.new_state}`,
        reason: ce.reason,
        state: ce.new_state,
      });
    });

    qosTransitions.forEach((qt, idx) => {
      list.push({
        id: `qos_${idx}_${qt.simulated_time_sec}`,
        time: qt.simulated_time_sec,
        type: 'qos',
        title: `Policy Transition: ${qt.previous_policy} → ${qt.new_policy}`,
        reason: qt.reason,
        policy: qt.new_policy,
      });
    });

    return list.sort((a, b) => b.time - a.time);
  }, [congestionEvents, qosTransitions]);

  if (unifiedEvents.length === 0) {
    return (
      <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-6 shadow-xl text-center text-slate-400 text-xs">
        <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        No simulation events logged yet. Events such as congestion onset, queue buffer saturation, and QoS policy adaptations will appear here in chronological order.
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-6 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-400" />
            Synchronized Simulation Event Timeline
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Temporal audit trail linking detector warnings, buffer saturation, QoS activations, and recovery.
          </p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
          {unifiedEvents.length} Events Logged
        </span>
      </div>

      <div className="space-y-3 max-h-[380px] overflow-y-auto pr-2">
        {unifiedEvents.map((evt) => {
          const isCongestion = evt.type === 'congestion';
          const isSevere = evt.state === 'congested';
          const isWarning = evt.state === 'warning';
          const isNormal = evt.state === 'normal';

          return (
            <div
              key={evt.id}
              className={`p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
                isCongestion
                  ? isSevere
                    ? 'bg-rose-500/10 border-rose-500/30'
                    : isWarning
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-indigo-500/10 border-indigo-500/30'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {isCongestion ? (
                  isSevere ? (
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                  ) : isWarning ? (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  )
                ) : (
                  <Cpu className="w-4 h-4 text-indigo-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-bold text-slate-100 truncate">
                    {evt.title}
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 shrink-0">
                    T = {Number(evt.time ?? 0).toFixed(1)}s
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                  {evt.reason}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
