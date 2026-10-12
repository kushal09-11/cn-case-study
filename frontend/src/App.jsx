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
import { FlowMetricsTable } from './components/FlowMetricsTable';
import { EventTimeline } from './components/EventTimeline';
import { GuidedDemoBar } from './components/GuidedDemoBar';
import { TerminologyModal } from './components/TerminologyModal';

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
                title="Clients"
                value={numClients}
                unit="flows"
                subtitle="Virtual Stations"
                icon={Users}
                color="sky"
                tooltip="Number of configured virtual Wi-Fi client stations contending for the AP link."
              />
              <MetricCard
                title="Capacity"
                value={linkCapacity}
                unit="Mbps"
                subtitle="Shared AP Link"
                icon={Wifi}
                color="indigo"
                tooltip="Configured transmission bandwidth limit of the shared virtual wireless bottleneck link."
              />
              <MetricCard
                title="Throughput"
                value={latest ? latest.delivered_throughput_mbps : 0.0}
                unit="Mbps"
                subtitle={`${latest ? latest.link_utilization_pct : 0}% Utilized`}
                icon={Activity}
                color={latest && latest.link_utilization_pct > 90 ? 'rose' : 'sky'}
                tooltip="Total successfully delivered bits per second across all flows."
              />
              <MetricCard
                title="Avg Latency"
                value={latest ? latest.avg_latency_ms : 5.0}
                unit="ms"
                subtitle="Queue + Wireless"
                icon={Clock}
                color={latest && latest.avg_latency_ms > 40 ? 'rose' : 'emerald'}
                tooltip="Arithmetic mean packet transit delay through the virtual AP buffer."
              />
              <MetricCard
                title="P95 Latency"
                value={latest ? latest.p95_latency_ms : 5.0}
                unit="ms"
                subtitle="95th Percentile"
                icon={Clock}
                color={latest && latest.p95_latency_ms > 60 ? 'rose' : 'amber'}
                tooltip="95th percentile of simulated packet delays (tail latency indicator)."
              />
              <MetricCard
                title="Packet Loss"
                value={latest ? latest.packet_loss_pct : 0.0}
                unit="%"
                subtitle={`${latest ? latest.total_packets_dropped : 0} dropped`}
                icon={ShieldAlert}
                color={latest && latest.packet_loss_pct > 0 ? 'rose' : 'emerald'}
                tooltip="Dropped packets divided by total generated packets (tail drops)."
              />
              <MetricCard
                title="Jitter"
                value={latest ? latest.jitter_ms : 0.0}
                unit="ms"
                subtitle="RFC 3393 Delta"
                icon={Activity}
                color="indigo"
                tooltip="Mean absolute variation in delay between consecutive packet deliveries."
              />
              <MetricCard
                title="Queue Buffer"
                value={latest ? latest.queue_occupancy_pct : 0.0}
                unit="%"
                subtitle="AP Buffer Depth"
                icon={HardDrive}
                color={latest && latest.queue_occupancy_pct > 70 ? 'rose' : 'emerald'}
                tooltip="Current instantaneous queued bytes relative to the 500 KB buffer capacity."
              />
            </div>

            {/* Quick Simulation Progress Bar if active */}
            {status?.is_running && (
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-lg">
                <div className="flex justify-between text-xs text-slate-300 mb-1.5 font-medium">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    Simulation In Progress (Step {status?.current_step})
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

            {/* Guided Experiment Walkthrough Stepper */}
            <GuidedDemoBar
              actions={actions}
              config={config}
              status={status}
              isBusy={isBusy}
            />

            {/* Main Interactive Topology Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <Wifi className="w-5 h-5 text-sky-400" />
                    Interactive Virtual Network Topology
                  </h2>
                  <p className="text-xs text-slate-400">
                    Click any station or router to inspect real-time flow queues and physical metrics.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('controls')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
                >
                  <Sliders className="w-3.5 h-3.5" /> Configure Presets
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
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Wifi className="w-5 h-5 text-sky-400" />
                Live React Flow Topology View
              </h2>
              <p className="text-xs text-slate-400">
                Visualizing virtual AP contention, active QoS controller, monitoring agent, and animated traffic flows.
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
                Discrete-Time Simulation Performance Analytics
              </h2>
              <p className="text-xs text-slate-400">
                Plots computed from verified simulation engine state history over discrete time steps.
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
          Adaptive Wi-Fi Congestion Detection &amp; QoS Simulation | Computer Networks Capstone Simulation Project
        </p>
        <p className="text-[10px] text-slate-400 mt-1">
          Discrete-Time Simulation Engine (Python FastAPI Backend + React Flow / Recharts Frontend)
        </p>
      </footer>
    </div>
  );
}
