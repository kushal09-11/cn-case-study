import React from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  Clock, 
  ArrowRight, 
  ShieldAlert, 
  Activity,
  Layers
} from 'lucide-react';

export function CongestionSection({ status, config, events, diagnostics }) {
  const currentState = status?.congestion_state || 'normal';

  const getStateHeader = () => {
    switch (currentState) {
      case 'congested':
        return {
          title: 'Network is Congested',
          desc: 'Too many devices are sending data at once. The network is overwhelmed — expect delays and dropped packets.',
          color: 'bg-rose-500/20 border-rose-500/40 text-rose-300',
          badge: 'High Impact',
        };
      case 'warning':
        return {
          title: 'High Traffic Warning',
          desc: 'The network is getting busy. Not yet congested, but delays may increase soon.',
          color: 'bg-amber-500/20 border-amber-500/40 text-amber-300',
          badge: 'Elevated Load',
        };
      case 'recovering':
        return {
          title: 'Recovering — Monitoring…',
          desc: 'Traffic has eased up. Waiting to confirm the network is stable before clearing the alert.',
          color: 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300',
          badge: 'Stabilizing',
        };
      default:
        return {
          title: 'All Good — Normal Operation',
          desc: 'Speed, delays, packet loss, and queue depth are all within healthy limits.',
          color: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
          badge: 'Healthy',
        };
    }
  };

  const headerInfo = getStateHeader();

  return (
    <div className="space-y-6">
      {/* State Banner */}
      <div className={`p-5 rounded-2xl border ${headerInfo.color} flex flex-wrap items-center justify-between gap-4 shadow-xl`}>
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/50">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold tracking-tight">{headerInfo.title}</h3>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-900/80 border border-slate-700">
                {headerInfo.badge}
              </span>
            </div>
            <p className="text-xs opacity-90 mt-0.5">{headerInfo.desc}</p>
          </div>
        </div>

        {/* Active Thresholds */}
        <div className="flex items-center gap-4 text-xs bg-slate-950/60 px-4 py-2 rounded-xl border border-slate-800">
          <div>
            <div className="text-[10px] text-slate-400">Congestion at</div>
            <div className="font-bold text-slate-200">{config?.threshold_utilization_congested}% usage</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400">Queue full at</div>
            <div className="font-bold text-slate-200">{config?.threshold_queue_occupancy_congested}%</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400">Drop alert at</div>
            <div className="font-bold text-slate-200">{config?.threshold_packet_loss_congested}% loss</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400">Delay alert at</div>
            <div className="font-bold text-slate-200">{config?.threshold_latency_congested_ms} ms</div>
          </div>
        </div>
      </div>

      {/* Root-Cause Hypotheses & Explanations */}
      <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-indigo-400" />
              Why is the Network Congested?
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              The simulator analyzes the network data and explains what is causing problems and what to do about it.
            </p>
          </div>
        </div>

        {diagnostics.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No analysis yet. Start the simulation to see what's causing issues.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {diagnostics.map((diag) => {
              const isHigh = diag.confidence === 'HIGH';
              return (
                <div 
                  key={diag.id}
                  className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="text-sm font-bold text-slate-100 leading-snug">
                        {diag.likely_cause}
                      </h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase shrink-0 ${
                        isHigh 
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' 
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}>
                        {diag.confidence} Confidence
                      </span>
                    </div>

                    {/* Supporting measurements */}
                    <div className="my-3 p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[11px] font-mono space-y-1">
                      <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Evidence:</div>
                      {Object.entries(diag.supporting_measurements || {}).map(([key, val]) => (
                        <div key={key} className="flex justify-between text-slate-300">
                          <span className="text-slate-400">{key}:</span>
                          <span className="font-semibold text-sky-400">{String(val)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-slate-800 text-xs text-emerald-400 flex items-start gap-1.5 font-medium">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                    <span><b>Action:</b> {diag.suggested_action}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Congestion State Transition Event History */}
      <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-6 shadow-xl">
        <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 mb-1">
          <Clock className="w-5 h-5 text-amber-400" />
          Congestion Event Log
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          A timeline of when the network became congested, recovered, or changed state during the simulation.
        </p>

        {events.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs border border-dashed border-slate-800 rounded-xl">
            No events yet. Run the simulation on Heavy Traffic to see congestion events appear here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/60 text-slate-400 uppercase text-[10px] font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">State Change</th>
                  <th className="py-2.5 px-3">What Triggered It</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {events.map((ev, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-mono text-sky-400">{ev.simulated_time_sec}s</td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1.5 font-medium capitalize">
                        <span className="text-slate-400">{ev.previous_state}</span>
                        <ArrowRight className="w-3 h-3 text-slate-500" />
                        <span className={
                          ev.new_state === 'congested' ? 'text-rose-400 font-bold' :
                          ev.new_state === 'warning' ? 'text-amber-400 font-bold' :
                          ev.new_state === 'recovering' ? 'text-cyan-400 font-bold' :
                          'text-emerald-400 font-bold'
                        }>
                          {ev.new_state}
                        </span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 leading-relaxed">
                      {ev.reason}
                    </td>
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
