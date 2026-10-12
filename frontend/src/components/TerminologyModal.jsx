import React from 'react';
import { X, BookOpen, Clock, Activity, ShieldAlert, HardDrive, Wifi, Layers } from 'lucide-react';

export function TerminologyModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const terms = [
    {
      term: 'FIFO (First-In, First-Out)',
      category: 'Scheduling Mode',
      icon: Layers,
      color: 'text-slate-400',
      definition:
        'The baseline queueing discipline where packets are served strictly in their arrival order without regard to application type or traffic class. Under high traffic, long bulk downloads fill the queue, causing large delays and tail drops for time-sensitive voice/video.',
    },
    {
      term: 'QoS (Quality of Service)',
      category: 'Traffic Management',
      icon: Wifi,
      color: 'text-indigo-400',
      definition:
        'A suite of mechanisms that classify packets into differentiated queues (Real-Time, Best-Effort, Bulk) and prioritize delivery to guarantee lower latency and jitter for mission-critical multimedia streams.',
    },
    {
      term: 'Link Utilization (%)',
      category: 'Capacity Metric',
      icon: Activity,
      color: 'text-sky-400',
      definition:
        'The percentage of the bottleneck link capacity currently occupied by transmitted data over a 100 ms measurement window. Formula: (Delivered Bits / Link Capacity Bits) * 100. Utilization cannot physically exceed 100%.',
    },
    {
      term: 'Queue Occupancy & Bufferbloat',
      category: 'Buffer Metric',
      icon: HardDrive,
      color: 'text-emerald-400',
      definition:
        'The amount of data waiting in the AP buffer relative to its total storage capacity (e.g. 500 KB). When a buffer stays nearly full under high load, packets endure excessive queueing delay before transmission—a phenomenon known as bufferbloat.',
    },
    {
      term: 'Average Latency (ms)',
      category: 'Delay Metric',
      icon: Clock,
      color: 'text-amber-400',
      definition:
        'The arithmetic mean time taken for packets to transit from arrival at the virtual station queue until complete transmission over the wireless link. Calculated as: (Delivery Time - Creation Time).',
    },
    {
      term: 'P95 Latency (ms)',
      category: 'Tail Delay Metric',
      icon: Clock,
      color: 'text-rose-400',
      definition:
        'The 95th percentile transit delay. 95% of packets experience equal or lower latency, while the worst 5% experience higher delay. P95 is the critical metric for video call stutter and interactive gaming smoothness.',
    },
    {
      term: 'Jitter (ms)',
      category: 'Delay Variation',
      icon: Activity,
      color: 'text-cyan-400',
      definition:
        'The statistical variation in packet transit delay between successive arrivals, following RFC 3393 / RFC 3550 principles (|D(i) - D(i-1)|). High jitter degrades voice and live streaming codecs.',
    },
    {
      term: 'Packet Loss (%)',
      category: 'Reliability Metric',
      icon: ShieldAlert,
      color: 'text-rose-400',
      definition:
        'The ratio of dropped packets to total generated packets: (Dropped Packets / Offered Packets) * 100. In this simulator, drops occur via tail drop when the shared or per-class buffer reaches capacity.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-sky-500/20 text-sky-400">
              <BookOpen className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Network Simulation Terminology &amp; Metrics Guide
              </h3>
              <p className="text-xs text-slate-400">
                Plain-language explanations of theoretical computer networking concepts.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto space-y-3.5 my-4 pr-1 flex-1">
          {terms.map((t) => {
            const Icon = t.icon;
            return (
              <div key={t.term} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${t.color}`} />
                    <span className="text-xs font-bold text-slate-100">{t.term}</span>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    {t.category}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed mt-1">
                  {t.definition}
                </p>
              </div>
            );
          })}
        </div>

        <div className="pt-3 border-t border-slate-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}
