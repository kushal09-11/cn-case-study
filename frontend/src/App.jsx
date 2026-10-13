import React, { useState } from 'react';
import { 
  Wifi, 
  Activity, 
  Clock, 
  ShieldAlert, 
  HardDrive, 
  ArrowUpRight, 
  Sliders, 
  Users, 
  Zap,
  Cpu,
  Layers,
  FileText
} from 'lucide-react';
import { useSimulation } from './hooks/useSimulation';
import { Navbar } from './components/Navbar';
import { MetricCard } from './components/MetricCard';
import { TopologyCanvas } from './components/TopologyCanvas';
import { NodeDetailsModal } from './components/NodeDetailsModal';
import { SimulationControls } from './components/SimulationControls';
import { AnalyticsCharts } from './components/AnalyticsCharts';
import { CongestionSection } from './components/CongestionSection';
import { QoSSection } from './components/QoSSection';
import { ComparisonModal } from './components/ComparisonModal';
import { HistorySection } from './components/HistorySection';
<<<<<<< HEAD
import { FlowMetricsTable } from './components/FlowMetricsTable';
import { EventTimeline } from './components/EventTimeline';
import { GuidedDemoBar } from './components/GuidedDemoBar';
import { TerminologyModal } from './components/TerminologyModal';
=======
import { WhatIsHappeningPanel } from './components/WhatIsHappeningPanel';
>>>>>>> origin/topologyimproved

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedNode, setSelectedNode] = useState(null);
  const [isTerminologyOpen, setIsTerminologyOpen] = useState(false);

  const {
    status,
    config,
    history,
    topology,
    events,
    diagnostics,
    qosStatus,
    qosHistory,
    isConnected,
    isBusy,
    actions,
  } = useSimulation();

  const latest = status?.latest_metrics;
  const numClients = config?.flows?.length || 0;
  const linkCapacity = config?.bottleneck_capacity_mbps || 50.0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500/30 selection:text-sky-200">
      {/* Top Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        status={status}
        isConnected={isConnected}
        isBusy={isBusy}
        actions={actions}
        onOpenTerminology={() => setIsTerminologyOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Top Metric Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3.5">
              <MetricCard
                title="Devices"
                value={numClients}
                unit="flows"
                subtitle="Active Connections"
                icon={Users}
                color="sky"
                tooltip="How many virtual Wi-Fi devices are sharing the network right now."
              />
              <MetricCard
                title="Speed Limit"
                value={linkCapacity}
                unit="Mbps"
                subtitle="Shared Wi-Fi Link"
                icon={Wifi}
                color="indigo"
                tooltip="The maximum speed of the shared wireless link. Think of it as the road's lane capacity."
              />
              <MetricCard
                title="Throughput"
                value={latest ? latest.delivered_throughput_mbps : 0.0}
                unit="Mbps"
                subtitle={`${latest ? latest.link_utilization_pct : 0}% Used`}
                icon={Activity}
                color={latest && latest.link_utilization_pct > 90 ? 'rose' : 'sky'}
                tooltip="How much data is actually getting through per second. Lower than the Speed Limit means congestion."
              />
              <MetricCard
                title="Avg Delay"
                value={latest ? latest.avg_latency_ms : 5.0}
                unit="ms"
                subtitle="Time to Deliver"
                icon={Clock}
                color={latest && latest.avg_latency_ms > 40 ? 'rose' : 'emerald'}
                tooltip="Average time it takes for a packet to travel through the network. High values mean the network is slow or congested."
              />
              <MetricCard
                title="Worst Delay"
                value={latest ? latest.p95_latency_ms : 5.0}
                unit="ms"
                subtitle="Slowest 5% of Packets"
                icon={Clock}
                color={latest && latest.p95_latency_ms > 60 ? 'rose' : 'amber'}
                tooltip="95% of packets are faster than this. High values indicate that some packets experience severe delays."
              />
              <MetricCard
                title="Packet Loss"
                value={latest ? latest.packet_loss_pct : 0.0}
                unit="%"
                subtitle={`${latest ? latest.total_packets_dropped : 0} dropped`}
                icon={ShieldAlert}
                color={latest && latest.packet_loss_pct > 0 ? 'rose' : 'emerald'}
                tooltip="Percentage of packets that were dropped because the network was too full. Any value above 0 is bad."
              />
              <MetricCard
                title="Jitter"
                value={latest ? latest.jitter_ms : 0.0}
                unit="ms"
                subtitle="Delay Variation"
                icon={Activity}
                color="indigo"
                tooltip="How consistent the delay is. High jitter makes video/voice calls choppy, even if average delay is low."
              />
              <MetricCard
                title="Buffer Fill"
                value={latest ? latest.queue_occupancy_pct : 0.0}
                unit="%"
                subtitle="Queue Fullness"
                icon={HardDrive}
                color={latest && latest.queue_occupancy_pct > 70 ? 'rose' : 'emerald'}
                tooltip="How full the router's waiting queue is. When this hits 100%, packets start getting dropped."
              />
            </div>

            {/* Quick Simulation Progress Bar if active */}
            {status?.is_running && (
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-lg">
                <div className="flex justify-between text-xs text-slate-300 mb-1.5 font-medium">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    Simulation running… (Step {status?.current_step})
                  </span>
                  <span className="font-mono text-sky-400">
                    {status?.current_time_seconds}s / {status?.duration_seconds}s
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all duration-300"
                    style={{
                      width: `${Math.min(100, ((status?.current_time_seconds || 0) / (status?.duration_seconds || 30)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}

<<<<<<< HEAD
            {/* Guided Experiment Walkthrough Stepper */}
            <GuidedDemoBar
              actions={actions}
              config={config}
              status={status}
              isBusy={isBusy}
=======
            {/* How to Use Guide */}
            {!status?.is_running && !status?.is_completed && (
              <div className="p-5 rounded-2xl bg-sky-500/5 border border-sky-500/20 shadow-lg">
                <h2 className="text-sm font-bold text-sky-300 mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4" /> Quick Start — How to use this simulator
                </h2>
                <ol className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-300">
                  <li className="flex gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center text-sm">1</span>
                    <div><span className="font-semibold text-slate-100">Go to Settings</span><br/>Pick a traffic scenario (Low, Medium, or High load) and choose how the network should handle congestion.</div>
                  </li>
                  <li className="flex gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center text-sm">2</span>
                    <div><span className="font-semibold text-slate-100">Press Start</span><br/>Click the green Start button above. Watch the metrics update live as the simulation runs.</div>
                  </li>
                  <li className="flex gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center text-sm">3</span>
                    <div><span className="font-semibold text-slate-100">Explore the results</span><br/>Check the Charts tab for graphs, Congestion Alerts for what went wrong, and Compare Runs to see how different strategies differ.</div>
                  </li>
                </ol>
              </div>
            )}

            {/* Dynamically Updated "What is happening?" Panel */}
            <WhatIsHappeningPanel 
              status={status}
              config={config}
              qosStatus={qosStatus}
              events={events}
>>>>>>> origin/topologyimproved
            />

            {/* Main Interactive Topology Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <Wifi className="w-5 h-5 text-sky-400" />
                    Network Map & Real-Time Traffic Flow
                  </h2>
                  <p className="text-xs text-slate-400">
                    Watch simulated packets flow from devices through the Wi-Fi router and bottleneck buffer to the destination server.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('controls')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
                >
                  <Sliders className="w-3.5 h-3.5" /> Open Settings
                </button>
              </div>

              <TopologyCanvas
                topology={topology}
                onSelectNode={(node) => setSelectedNode(node)}
              />
            </div>

            {/* Live Chart Previews */}
            <AnalyticsCharts history={history.slice(-40)} />

            {/* Per-Flow Granular Metrics Table */}
            <FlowMetricsTable
              latestMetrics={latest}
              config={config}
            />

            {/* Synchronized Simulation Event Timeline */}
            <EventTimeline
              congestionEvents={events}
              qosTransitions={qosHistory}
            />
          </div>
        )}

        {/* TAB 2: TOPOLOGY */}
        {activeTab === 'topology' && (
          <div className="space-y-4">
            <WhatIsHappeningPanel 
              status={status}
              config={config}
              qosStatus={qosStatus}
              events={events}
            />

            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Wifi className="w-5 h-5 text-sky-400" />
                Network Map & Packet Queue Flow
              </h2>
              <p className="text-xs text-slate-400">
                Data travels from left (clients) through the router and bottleneck buffer to the right (target server).
              </p>
            </div>
            <TopologyCanvas
              topology={topology}
              onSelectNode={(node) => setSelectedNode(node)}
            />
          </div>
        )}

        {/* TAB 3: CONTROLS */}
        {activeTab === 'controls' && (
          <SimulationControls
            config={config}
            status={status}
            isBusy={isBusy}
            actions={actions}
          />
        )}

        {/* TAB 4: ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Activity className="w-5 h-5 text-sky-400" />
                Performance Charts
              </h2>
              <p className="text-xs text-slate-400">
                Live graphs showing speed, delay, packet loss, and more over time as the simulation runs.
              </p>
            </div>
            <AnalyticsCharts history={history} />
          </div>
        )}

        {/* TAB 5: CONGESTION */}
        {activeTab === 'congestion' && (
          <CongestionSection
            status={status}
            config={config}
            events={events}
            diagnostics={diagnostics}
          />
        )}

        {/* TAB 6: QOS */}
        {activeTab === 'qos' && (
          <QoSSection
            qosStatus={qosStatus}
            qosHistory={qosHistory}
            config={config}
            status={status}
          />
        )}

        {/* TAB 7: COMPARISON */}
        {activeTab === 'comparison' && (
          <ComparisonModal config={config} />
        )}

        {/* TAB 8: HISTORY */}
        {activeTab === 'history' && (
          <HistorySection />
        )}
      </main>

      {/* Terminology & Metrics Modal */}
      <TerminologyModal
        isOpen={isTerminologyOpen}
        onClose={() => setIsTerminologyOpen(false)}
      />

      {/* Node Inspector Drawer */}
      {selectedNode && (
        <NodeDetailsModal
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 px-6 text-center text-xs text-slate-400">
        <p>
          Wi-Fi Network Congestion & Traffic Priority Simulator | Computer Networks Capstone Project
        </p>
        <p className="text-[10px] text-slate-400 mt-1">
          Python (FastAPI) backend + React frontend
        </p>
      </footer>
    </div>
  );
}
