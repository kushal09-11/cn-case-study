import React from 'react';
import { X, Server, Laptop, Cpu, ShieldAlert, Activity, HardDrive, Globe } from 'lucide-react';

export function NodeDetailsModal({ node, onClose }) {
  if (!node) return null;

  const { type, label, details = {} } = node;

  const getHeaderIcon = () => {
    switch (type) {
      case 'router':
        return <Server className="w-5 h-5 text-sky-400" />;
      case 'queue':
        return <HardDrive className="w-5 h-5 text-sky-400" />;
      case 'server':
        return <Globe className="w-5 h-5 text-emerald-400" />;
      case 'monitor':
        return <ShieldAlert className="w-5 h-5 text-amber-400" />;
      case 'controller':
        return <Cpu className="w-5 h-5 text-indigo-400" />;
      default:
        return <Laptop className="w-5 h-5 text-emerald-400" />;
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-slate-900/95 border-l border-slate-800 p-6 shadow-2xl backdrop-blur-lg z-50 overflow-y-auto">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-slate-800 border border-slate-700">
            {getHeaderIcon()}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">{label}</h3>
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              {type} Node Details
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="mt-5 space-y-4">
        {type === 'router' && (
          <>
            <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 space-y-2">
              <div className="text-xs font-semibold text-sky-400 uppercase tracking-wider">Bottleneck Link</div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Configured Capacity:</span>
                <span className="font-semibold text-slate-200">{details.bottleneck_capacity_mbps} Mbps</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Aggregate Throughput:</span>
                <span className="font-semibold text-slate-200">{details.aggregate_throughput_mbps} Mbps</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Link Utilization:</span>
                <span className="font-semibold text-slate-200">{details.link_utilization_pct}%</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 space-y-2">
              <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Buffer & Queue</div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Queue Occupancy:</span>
                <span className="font-semibold text-slate-200">{details.queue_occupancy_pct}% ({details.queue_occupancy_bytes} B)</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Queue Capacity:</span>
                <span className="font-semibold text-slate-200">{details.queue_capacity_bytes} Bytes</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Packet Drops (Tail Drop):</span>
                <span className={`font-semibold ${details.packet_drops > 0 ? 'text-rose-400' : 'text-slate-200'}`}>
                  {details.packet_drops} pkts
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 space-y-2">
              <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">State & Policy</div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Congestion State:</span>
                <span className="font-semibold capitalize text-amber-300">{details.congestion_state}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Active Policy:</span>
                <span className="font-semibold text-slate-200">{details.active_qos_policy}</span>
              </div>
            </div>
          </>
        )}

        {type === 'queue' && (
          <>
            <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 space-y-2">
              <div className="text-xs font-semibold text-sky-400 uppercase tracking-wider">Buffer & Queue Occupancy</div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Current Occupancy:</span>
                <span className="font-semibold text-slate-200">{details.queue_occupancy_pct}% ({Math.round((details.queue_occupancy_bytes || 0) / 1000)} KB)</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Total Buffer Capacity:</span>
                <span className="font-semibold text-slate-200">{Math.round((details.queue_capacity_bytes || 500000) / 1000)} KB</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Packets Dropped:</span>
                <span className={`font-semibold ${details.packet_drops > 0 ? 'text-rose-400' : 'text-slate-200'}`}>
                  {details.packet_drops} pkts ({details.packet_loss_pct || 0}%)
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 space-y-2">
              <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Queue Latency & Scheduling</div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Average Delay:</span>
                <span className="font-semibold text-slate-200">{details.avg_latency_ms} ms</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">P95 Delay:</span>
                <span className="font-semibold text-slate-200">{details.p95_latency_ms} ms</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Active Policy:</span>
                <span className="font-semibold text-slate-200">{details.active_policy}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Bulk Rate Limit:</span>
                <span className="font-semibold text-amber-300">{details.bulk_rate_limit || '100%'}</span>
              </div>
            </div>
          </>
        )}

        {type === 'server' && (
          <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 space-y-2">
            <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">WAN Egress & Delivery</div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Delivered Throughput:</span>
              <span className="font-semibold text-emerald-300">{details.delivered_throughput_mbps} Mbps</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Total Packets Received:</span>
              <span className="font-semibold text-slate-200">{details.total_delivered_packets}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">End-to-End Latency:</span>
              <span className="font-semibold text-slate-200">{details.avg_latency_ms} ms</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Server Status:</span>
              <span className="font-semibold text-slate-200 capitalize">{details.status}</span>
            </div>
          </div>
        )}

        {type === 'client' && (
          <>
            <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 space-y-2">
              <div className="text-xs font-semibold text-sky-400 uppercase tracking-wider">Client Traffic Profile</div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Traffic Category:</span>
                <span className="font-semibold capitalize text-slate-200">{details.category?.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Offered Load:</span>
                <span className="font-semibold text-slate-200">{details.offered_load_mbps} Mbps</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Packet Size:</span>
                <span className="font-semibold text-slate-200">{details.packet_size_bytes} Bytes</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 space-y-2">
              <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Simulated Telemetry</div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Delivered Throughput:</span>
                <span className="font-semibold text-slate-200">{details.delivered_throughput_mbps} Mbps</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Simulated Latency:</span>
                <span className="font-semibold text-slate-200">{details.avg_latency_ms} ms</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">P95 Latency:</span>
                <span className="font-semibold text-slate-200">{details.p95_latency_ms} ms</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Simulated Jitter:</span>
                <span className="font-semibold text-slate-200">{details.jitter_ms} ms</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Packet Loss:</span>
                <span className={`font-semibold ${details.packet_loss_pct > 0 ? 'text-rose-400' : 'text-slate-200'}`}>
                  {details.packet_loss_pct}%
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Packets Dropped:</span>
                <span className="font-semibold text-slate-200">{details.dropped_packets || 0}</span>
              </div>
            </div>
          </>
        )}

        {type === 'monitor' && (
          <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 space-y-2">
            <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Detection Signals</div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Current Health State:</span>
              <span className="font-semibold capitalize text-slate-200">{details.state}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Warning Threshold (Util):</span>
              <span className="font-semibold text-slate-200">{details.warning_threshold_util}%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Congestion Threshold (Util):</span>
              <span className="font-semibold text-slate-200">{details.congested_threshold_util}%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Congestion Threshold (Queue):</span>
              <span className="font-semibold text-slate-200">{details.congested_threshold_queue}%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Events Logged:</span>
              <span className="font-semibold text-slate-200">{details.events_detected}</span>
            </div>
          </div>
        )}

        {type === 'controller' && (
          <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 space-y-2">
            <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Policy Engine</div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Active Mode:</span>
              <span className="font-semibold text-slate-200">{details.qos_mode}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Active Rule:</span>
              <span className="font-semibold text-slate-200">{details.active_policy}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Congestion Bulk Quota:</span>
              <span className="font-semibold text-slate-200">{details.bulk_rate_limit}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Transitions Logged:</span>
              <span className="font-semibold text-slate-200">{details.transitions_count}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
