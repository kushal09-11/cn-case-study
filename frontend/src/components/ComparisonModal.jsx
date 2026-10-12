import React, { useState } from 'react';
import { 
  GitCompare, 
  Play, 
  CheckCircle2, 
  ArrowUpRight, 
  ArrowDownRight, 
  Info,
  Clock,
  Layers,
  BarChart3
} from 'lucide-react';
import * as api from '../services/api';

export function ComparisonModal({ config, onComplete }) {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleRunComparison = async () => {
    setIsRunning(true);
    setError(null);
    try {
      const data = await api.runComparison({
        use_current_scenario: true,
        bottleneck_capacity_mbps: config?.bottleneck_capacity_mbps || 50.0,
        duration_seconds: config?.duration_seconds || 20.0,
        random_seed: config?.random_seed || 42,
      });
      setResults(data);
      if (onComplete) onComplete();
    } catch (err) {
      console.error(err);
      setError('Failed to run experiment comparison. Ensure backend is running.');
    } finally {
      setIsRunning(false);
    }
  };

  const calculateChange = (base, compare, lowerIsBetter = true) => {
    if (!base || base === 0) return null;
    const diff = compare - base;
    const pct = ((diff / base) * 100).toFixed(1);
    const isImproved = lowerIsBetter ? diff < 0 : diff > 0;
    return {
      diff: Math.abs(diff).toFixed(1),
      pct: Math.abs(pct),
      isImproved,
      isEqual: diff === 0,
      direction: diff > 0 ? 'up' : 'down',
    };
  };

  const numClients = config?.flows?.length || 0;
  const totalLoad = Math.round(config?.flows?.reduce((acc, f) => acc + (f.offered_load_mbps || 0), 0) || 0);

  return (
    <div className="space-y-6">
      {/* Intro banner */}
      <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-sky-400" />
            Fair 3-Way QoS Controlled Benchmark
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Simulates <b>Baseline FIFO</b>, <b>Static Strict Priority</b>, and <b>Adaptive QoS</b> sequentially using the <b>exact identical scenario</b> ({numClients} clients, ~{totalLoad} Mbps offered demand, Seed #{config?.random_seed}), link capacity ({config?.bottleneck_capacity_mbps} Mbps), and duration.
          </p>
        </div>

        <button
          onClick={handleRunComparison}
          disabled={isRunning}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-600/25 transition-all disabled:opacity-50"
        >
          {isRunning ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Simulating 3 Configurations...
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              Run Controlled Benchmark
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {results && (
        <>
          {/* Side-by-Side Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Baseline */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mode A</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">Baseline FIFO</span>
              </div>
              <h4 className="text-base font-bold text-slate-100 mb-4">No QoS Prioritization</h4>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Real-Time Video Latency:</span>
                  <span className="font-bold text-rose-400">{results.baseline.real_time_avg_latency_ms} ms</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Real-Time Packet Loss:</span>
                  <span className="font-bold text-rose-400">{results.baseline.real_time_loss_pct}%</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Total Throughput:</span>
                  <span className="font-bold text-slate-200">{results.baseline.overall_throughput_mbps} Mbps</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Congestion Duration:</span>
                  <span className="font-bold text-amber-400">{results.baseline.congestion_duration_seconds}s</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400">Avg Buffer Occupancy:</span>
                  <span className="font-bold text-slate-200">{results.baseline.avg_queue_occupancy_pct}%</span>
                </div>
              </div>
            </div>

            {/* Static QoS */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-sky-500/40 shadow-xl ring-1 ring-sky-500/20">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">Mode B</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">Static Strict Priority</span>
              </div>
              <h4 className="text-base font-bold text-slate-100 mb-4">Real-Time Priority Queue</h4>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-800/80 items-center">
                  <span className="text-slate-400">Real-Time Video Latency:</span>
                  <div className="text-right">
                    <span className="font-bold text-emerald-400">{results.static_qos.real_time_avg_latency_ms} ms</span>
                    {(() => {
                      const c = calculateChange(results.baseline.real_time_avg_latency_ms, results.static_qos.real_time_avg_latency_ms, true);
                      return c && !c.isEqual ? (
                        <span className={`block text-[10px] font-semibold ${c.isImproved ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {c.isImproved ? '▼' : '▲'} {c.pct}% {c.isImproved ? 'improved' : ''}
                        </span>
                      ) : null;
                    })()}
                  </div>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-800/80 items-center">
                  <span className="text-slate-400">Real-Time Packet Loss:</span>
                  <div className="text-right">
                    <span className="font-bold text-emerald-400">{results.static_qos.real_time_loss_pct}%</span>
                    {(() => {
                      const c = calculateChange(results.baseline.real_time_loss_pct, results.static_qos.real_time_loss_pct, true);
                      return c && !c.isEqual ? (
                        <span className={`block text-[10px] font-semibold ${c.isImproved ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {c.isImproved ? '▼' : '▲'} {c.pct}%
                        </span>
                      ) : null;
                    })()}
                  </div>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Total Throughput:</span>
                  <span className="font-bold text-slate-200">{results.static_qos.overall_throughput_mbps} Mbps</span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Congestion Duration:</span>
                  <span className="font-bold text-amber-400">{results.static_qos.congestion_duration_seconds}s</span>
                </div>

                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400">Avg Buffer Occupancy:</span>
                  <span className="font-bold text-slate-200">{results.static_qos.avg_queue_occupancy_pct}%</span>
                </div>
              </div>
            </div>

            {/* Adaptive QoS */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-indigo-500/40 shadow-xl ring-1 ring-indigo-500/20">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Mode C</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Adaptive Controller</span>
              </div>
              <h4 className="text-base font-bold text-slate-100 mb-4">Congestion-Feedback QoS</h4>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-800/80 items-center">
                  <span className="text-slate-400">Real-Time Video Latency:</span>
                  <div className="text-right">
                    <span className="font-bold text-emerald-400">{results.adaptive_qos.real_time_avg_latency_ms} ms</span>
                    {(() => {
                      const c = calculateChange(results.baseline.real_time_avg_latency_ms, results.adaptive_qos.real_time_avg_latency_ms, true);
                      return c && !c.isEqual ? (
                        <span className={`block text-[10px] font-semibold ${c.isImproved ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {c.isImproved ? '▼' : '▲'} {c.pct}% {c.isImproved ? 'improved' : ''}
                        </span>
                      ) : null;
                    })()}
                  </div>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-800/80 items-center">
                  <span className="text-slate-400">Real-Time Packet Loss:</span>
                  <div className="text-right">
                    <span className="font-bold text-emerald-400">{results.adaptive_qos.real_time_loss_pct}%</span>
                    {(() => {
                      const c = calculateChange(results.baseline.real_time_loss_pct, results.adaptive_qos.real_time_loss_pct, true);
                      return c && !c.isEqual ? (
                        <span className={`block text-[10px] font-semibold ${c.isImproved ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {c.isImproved ? '▼' : '▲'} {c.pct}%
                        </span>
                      ) : null;
                    })()}
                  </div>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Total Throughput:</span>
                  <span className="font-bold text-slate-200">{results.adaptive_qos.overall_throughput_mbps} Mbps</span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">QoS Policy Transitions:</span>
                  <span className="font-bold text-indigo-400">{results.adaptive_qos.qos_transitions_count} switches</span>
                </div>

                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400">Bulk Traffic Throttled:</span>
                  <span className="font-bold text-slate-300">{results.adaptive_qos.bulk_throughput_mbps} Mbps (Active cap)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Side-by-Side Comparison Table */}
          <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-6 shadow-xl overflow-x-auto">
            <h4 className="text-sm font-bold text-slate-100 mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-sky-400" />
              Side-by-Side Comprehensive Metrics Matrix
            </h4>

            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/60 text-slate-400 uppercase text-[10px] font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Performance Metric</th>
                  <th className="py-2.5 px-3">Baseline FIFO</th>
                  <th className="py-2.5 px-3">Static QoS</th>
                  <th className="py-2.5 px-3">Adaptive QoS</th>
                  <th className="py-2.5 px-3">Evaluation Insight</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-200">Real-Time Avg Latency (ms)</td>
                  <td className="py-2.5 px-3 font-mono text-rose-400">{results.baseline.real_time_avg_latency_ms} ms</td>
                  <td className="py-2.5 px-3 font-mono text-emerald-400">{results.static_qos.real_time_avg_latency_ms} ms</td>
                  <td className="py-2.5 px-3 font-mono text-emerald-400">{results.adaptive_qos.real_time_avg_latency_ms} ms</td>
                  <td className="py-2.5 px-3 text-slate-400">Lower is better. Priority queues evacuate video packets first.</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-200">Real-Time Packet Loss (%)</td>
                  <td className="py-2.5 px-3 font-mono text-rose-400">{results.baseline.real_time_loss_pct}%</td>
                  <td className="py-2.5 px-3 font-mono text-emerald-400">{results.static_qos.real_time_loss_pct}%</td>
                  <td className="py-2.5 px-3 font-mono text-emerald-400">{results.adaptive_qos.real_time_loss_pct}%</td>
                  <td className="py-2.5 px-3 text-slate-400">Zero packet loss achieved for video under QoS prioritization.</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-200">Overall 95th % Latency (ms)</td>
                  <td className="py-2.5 px-3 font-mono">{results.baseline.overall_p95_latency_ms} ms</td>
                  <td className="py-2.5 px-3 font-mono">{results.static_qos.overall_p95_latency_ms} ms</td>
                  <td className="py-2.5 px-3 font-mono">{results.adaptive_qos.overall_p95_latency_ms} ms</td>
                  <td className="py-2.5 px-3 text-slate-400">Reflects tail latency experienced by bulk packets when throttled.</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-200">Aggregate Throughput (Mbps)</td>
                  <td className="py-2.5 px-3 font-mono">{results.baseline.overall_throughput_mbps} Mbps</td>
                  <td className="py-2.5 px-3 font-mono">{results.static_qos.overall_throughput_mbps} Mbps</td>
                  <td className="py-2.5 px-3 font-mono">{results.adaptive_qos.overall_throughput_mbps} Mbps</td>
                  <td className="py-2.5 px-3 text-slate-400">Total delivered bits divided by 20s test duration.</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-200">Bulk Download Throughput</td>
                  <td className="py-2.5 px-3 font-mono">{results.baseline.bulk_throughput_mbps} Mbps</td>
                  <td className="py-2.5 px-3 font-mono">{results.static_qos.bulk_throughput_mbps} Mbps</td>
                  <td className="py-2.5 px-3 font-mono text-amber-400">{results.adaptive_qos.bulk_throughput_mbps} Mbps</td>
                  <td className="py-2.5 px-3 text-slate-400">Adaptive intentionally throttles bulk to protect video latency.</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-200">Jitter (ms)</td>
                  <td className="py-2.5 px-3 font-mono">{results.baseline.overall_jitter_ms} ms</td>
                  <td className="py-2.5 px-3 font-mono">{results.static_qos.overall_jitter_ms} ms</td>
                  <td className="py-2.5 px-3 font-mono">{results.adaptive_qos.overall_jitter_ms} ms</td>
                  <td className="py-2.5 px-3 text-slate-400">RFC 3393 packet inter-arrival delay variance.</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Academic Recommendations */}
          <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-6 shadow-xl space-y-2">
            <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider mb-2">
              Engineering Findings &amp; Tradeoff Analysis
            </h4>
            {results.recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-slate-300 leading-relaxed">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{rec}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
