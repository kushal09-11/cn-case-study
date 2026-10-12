"""Simulation Service managing execution lifecycle, background workers, and persistence."""

import asyncio
import json
import csv
import io
import uuid
from typing import List, Dict, Any, Optional, Set
from fastapi import WebSocket

from app.simulation.models import (
    SimulationConfig,
    QoSMode,
    CongestionState,
    TrafficCategory,
    StepMetrics,
    AggregateMetrics,
    FlowConfig
)
from app.simulation.engine import NetworkSimulationEngine
from app.simulation.presets import create_default_config, get_preset_flows, generate_random_scenario
from app.congestion.diagnostics import CongestionDiagnostics, DiagnosisReport
from app.database.db import SessionLocal, Base, engine
from app.database.models import (
    SimConfigModel,
    ExperimentModel,
    MetricSnapshotModel,
    CongestionEventModel,
    QoSTransitionModel
)
from app.schemas.schemas import ComparisonResponse, ComparisonResultItem


class SimulationService:
    def __init__(self):
        # Initialize DB tables
        Base.metadata.create_all(bind=engine)

        self.current_config: SimulationConfig = create_default_config("high", QoSMode.BASELINE)
        self.engine: NetworkSimulationEngine = NetworkSimulationEngine(self.current_config)
        
        # Async background worker state
        self._task: Optional[asyncio.Task] = None
        self._lock = asyncio.Lock()
        self.speed_multiplier: float = 1.0  # 1.0 = real-time pacing, higher = faster
        self.active_websockets: Set[WebSocket] = set()

    def update_config(self, new_config: SimulationConfig) -> SimulationConfig:
        self.current_config = new_config
        self.engine.reset(new_config)
        return self.current_config

    def generate_new_scenario(self, seed: Optional[int] = None) -> Dict[str, Any]:
        """Generate and apply a brand-new random scenario with randomized clients, bursts, and workload."""
        flows, actual_seed, meta = generate_random_scenario(
            seed=seed,
            bottleneck_capacity_mbps=self.current_config.bottleneck_capacity_mbps
        )
        self.current_config.flows = flows
        self.current_config.random_seed = actual_seed
        self.current_config.scenario_name = f"Random Scenario #{actual_seed}"
        self.engine.reset(self.current_config)
        return {
            "seed": actual_seed,
            "num_clients": len(flows),
            "baseline_offered_load_mbps": meta["baseline_offered_load_mbps"],
            "peak_offered_load_mbps": meta["peak_offered_load_mbps"],
            "expected_congestion": meta["expected_congestion"],
            "flows": [f.__dict__ for f in flows],
            "message": f"Generated new scenario #{actual_seed} with {len(flows)} clients"
        }

    def set_preset(self, preset_name: str, qos_mode: Optional[QoSMode] = None) -> SimulationConfig:
        mode = qos_mode or self.current_config.qos_mode
        self.current_config = create_default_config(preset_name, mode)
        self.engine.reset(self.current_config)
        return self.current_config

    async def start(self) -> None:
        async with self._lock:
            if self.engine.is_running:
                return
            if self.engine.is_completed:
                self.engine.reset(self.current_config)

            self.engine.is_running = True
            self.engine.is_paused = False

            if self._task is None or self._task.done():
                self._task = asyncio.create_task(self._run_loop())

    async def pause(self) -> None:
        async with self._lock:
            if self.engine.is_running:
                self.engine.is_paused = True
                self.engine.is_running = False

    async def resume(self) -> None:
        async with self._lock:
            if self.engine.is_paused and not self.engine.is_completed:
                self.engine.is_running = True
                self.engine.is_paused = False
                if self._task is None or self._task.done():
                    self._task = asyncio.create_task(self._run_loop())

    async def stop(self) -> None:
        async with self._lock:
            self.engine.is_running = False
            self.engine.is_paused = False
            if self._task and not self._task.done():
                self._task.cancel()
                try:
                    await self._task
                except asyncio.CancelledError:
                    pass

    async def reset(self) -> None:
        await self.stop()
        self.engine.reset(self.current_config)
        await self.broadcast_update()

    async def _run_loop(self) -> None:
        try:
            while self.engine.is_running and not self.engine.is_completed:
                step_metrics = self.engine.step()
                await self.broadcast_update()

                # Sleep interval scaled by time_step and speed multiplier
                sleep_duration = max(0.01, (self.current_config.time_step_seconds / max(0.1, self.speed_multiplier)))
                await asyncio.sleep(sleep_duration)

            if self.engine.is_completed:
                self.persist_current_run()
                await self.broadcast_update()
        except asyncio.CancelledError:
            pass

    async def register_ws(self, ws: WebSocket) -> None:
        self.active_websockets.add(ws)

    def unregister_ws(self, ws: WebSocket) -> None:
        self.active_websockets.discard(ws)

    async def broadcast_update(self) -> None:
        if not self.active_websockets:
            return

        payload = self.get_status_dict()
        dead_sockets = set()
        for ws in self.active_websockets:
            try:
                await ws.send_text(json.dumps(payload))
            except Exception:
                dead_sockets.add(ws)

        for ws in dead_sockets:
            self.active_websockets.discard(ws)

    def get_status_dict(self) -> Dict[str, Any]:
        latest = self.engine.last_step_metrics
        latest_dict = None
        if latest:
            latest_dict = {
                "step_index": latest.step_index,
                "simulated_time_seconds": latest.simulated_time_seconds,
                "qos_mode": latest.qos_mode.value,
                "active_policy": latest.active_policy,
                "congestion_state": latest.congestion_state.value,
                "offered_load_mbps": latest.offered_load_mbps,
                "delivered_throughput_mbps": latest.delivered_throughput_mbps,
                "link_utilization_pct": latest.link_utilization_pct,
                "queue_occupancy_bytes": latest.queue_occupancy_bytes,
                "queue_occupancy_pct": latest.queue_occupancy_pct,
                "avg_latency_ms": latest.avg_latency_ms,
                "p95_latency_ms": latest.p95_latency_ms,
                "jitter_ms": latest.jitter_ms,
                "packet_loss_pct": latest.packet_loss_pct,
                "total_packets_generated": latest.total_packets_generated,
                "total_packets_delivered": latest.total_packets_delivered,
                "total_packets_dropped": latest.total_packets_dropped,
                "category_throughput_mbps": latest.category_throughput_mbps,
                "category_latency_ms": latest.category_latency_ms,
                "category_loss_pct": latest.category_loss_pct,
                "flow_metrics": {
                    k: {
                        "flow_id": v.flow_id,
                        "category": v.category.value,
                        "generated_packets": v.generated_packets,
                        "delivered_packets": v.delivered_packets,
                        "dropped_packets": v.dropped_packets,
                        "throughput_mbps": v.throughput_mbps,
                        "avg_latency_ms": v.avg_latency_ms,
                        "p95_latency_ms": v.p95_latency_ms,
                        "jitter_ms": v.jitter_ms,
                        "packet_loss_pct": v.packet_loss_pct,
                        "queue_occupancy_bytes": v.queue_occupancy_bytes
                    }
                    for k, v in latest.flow_metrics.items()
                }
            }

        return {
            "is_running": self.engine.is_running,
            "is_paused": self.engine.is_paused,
            "is_completed": self.engine.is_completed,
            "current_step": self.engine.current_step,
            "current_time_seconds": round(self.engine.current_time_sec, 2),
            "duration_seconds": self.current_config.duration_seconds,
            "qos_mode": self.current_config.qos_mode.value,
            "active_policy": self.engine.qos_controller.active_policy_name,
            "congestion_state": self.engine.congestion_detector.current_state.value,
            "latest_metrics": latest_dict
        }

    def get_topology(self) -> Dict[str, Any]:
        """Generate React Flow nodes and edges reflecting current simulated topology and flow states."""
        nodes: List[Dict[str, Any]] = []
        edges: List[Dict[str, Any]] = []

        is_congested = (self.engine.congestion_detector.current_state == CongestionState.CONGESTED)
        latest = self.engine.last_step_metrics
        flows = self.current_config.flows
        num_flows = len(flows)

        # 1. Virtual Wi-Fi Router / Access Point Node
        router_details = {
            "bottleneck_capacity_mbps": self.current_config.bottleneck_capacity_mbps,
            "ingress_mbps": latest.offered_load_mbps if latest else 0.0,
            "delivered_throughput_mbps": latest.delivered_throughput_mbps if latest else 0.0,
            "link_utilization_pct": latest.link_utilization_pct if latest else 0.0,
            "congestion_state": self.engine.congestion_detector.current_state.value,
            "active_qos_policy": self.engine.qos_controller.active_policy_name,
            "active_flows_count": num_flows,
            "queue_occupancy_pct": latest.queue_occupancy_pct if latest else 0.0,
            "packet_drops": latest.total_packets_dropped if latest else 0
        }
        nodes.append({
            "id": "node_router",
            "type": "router",
            "label": "Wi-Fi Router (AP)",
            "position": {"x": 340, "y": 240},
            "details": router_details
        })

        # 2. Bottleneck Queue & Buffer Node
        queue_details = {
            "queue_capacity_bytes": self.current_config.queue_capacity_bytes,
            "queue_occupancy_bytes": latest.queue_occupancy_bytes if latest else 0,
            "queue_occupancy_pct": latest.queue_occupancy_pct if latest else 0.0,
            "packet_drops": latest.total_packets_dropped if latest else 0,
            "packet_loss_pct": latest.packet_loss_pct if latest else 0.0,
            "avg_latency_ms": latest.avg_latency_ms if latest else 5.0,
            "p95_latency_ms": latest.p95_latency_ms if latest else 5.0,
            "active_policy": self.engine.qos_controller.active_policy_name,
            "qos_mode": self.current_config.qos_mode.value,
            "is_throttling": self.engine.qos_controller.is_throttling_bulk,
            "bulk_rate_limit": f"{int(self.current_config.adaptive_bulk_rate_limit_ratio * 100)}%"
        }
        nodes.append({
            "id": "node_queue",
            "type": "queue",
            "label": "Bottleneck Queue & Scheduler",
            "position": {"x": 580, "y": 240},
            "details": queue_details
        })

        # 3. Target Destination Server Node
        server_details = {
            "delivered_throughput_mbps": latest.delivered_throughput_mbps if latest else 0.0,
            "total_delivered_packets": latest.total_packets_delivered if latest else 0,
            "total_packets_generated": latest.total_packets_generated if latest else 0,
            "avg_latency_ms": latest.avg_latency_ms if latest else 5.0,
            "status": "Receiving" if self.engine.is_running else ("Complete" if self.engine.is_completed else "Ready")
        }
        nodes.append({
            "id": "node_server",
            "type": "server",
            "label": "Destination Server / Internet",
            "position": {"x": 820, "y": 240},
            "details": server_details
        })

        # 4. Monitoring Agent Node (Control Plane - Above)
        nodes.append({
            "id": "node_monitor",
            "type": "monitor",
            "label": "Congestion Detector Agent",
            "position": {"x": 460, "y": 40},
            "details": {
                "state": self.engine.congestion_detector.current_state.value,
                "warning_threshold_util": self.current_config.threshold_utilization_warning,
                "congested_threshold_util": self.current_config.threshold_utilization_congested,
                "congested_threshold_queue": self.current_config.threshold_queue_occupancy_congested,
                "events_detected": len(self.engine.congestion_detector.events),
                "active_latency_ms": latest.avg_latency_ms if latest else 5.0,
                "active_loss_pct": latest.packet_loss_pct if latest else 0.0
            }
        })

        # 5. QoS Controller Node (Control Plane - Below)
        nodes.append({
            "id": "node_controller",
            "type": "controller",
            "label": "QoS Policy Controller",
            "position": {"x": 460, "y": 450},
            "details": {
                "qos_mode": self.current_config.qos_mode.value,
                "active_policy": self.engine.qos_controller.active_policy_name,
                "bulk_rate_limit": f"{int(self.current_config.adaptive_bulk_rate_limit_ratio * 100)}%",
                "is_throttling": self.engine.qos_controller.is_throttling_bulk,
                "transitions_count": len(self.engine.qos_controller.transitions)
            }
        })

        # 6. Virtual Client Nodes (Data Plane - Left column, evenly spaced)
        step_y = max(68, min(105, int(420 / max(1, num_flows - 1)))) if num_flows > 1 else 100
        y_start = max(50, int(240 - ((num_flows - 1) * step_y) / 2))

        for i, f in enumerate(flows):
            client_x = 40
            client_y = y_start + (i * step_y)
            f_metric = latest.flow_metrics.get(f.flow_id) if latest else None

            client_details = {
                "flow_id": f.flow_id,
                "client_id": f.client_id,
                "client_name": f.client_name,
                "category": f.category.value,
                "offered_load_mbps": f.offered_load_mbps,
                "packet_size_bytes": f.packet_size_bytes,
                "delivered_throughput_mbps": f_metric.throughput_mbps if f_metric else 0.0,
                "avg_latency_ms": f_metric.avg_latency_ms if f_metric else 5.0,
                "p95_latency_ms": f_metric.p95_latency_ms if f_metric else 5.0,
                "jitter_ms": f_metric.jitter_ms if f_metric else 0.0,
                "packet_loss_pct": f_metric.packet_loss_pct if f_metric else 0.0,
                "dropped_packets": f_metric.dropped_packets if f_metric else 0,
                "is_bursting": getattr(f_metric, "is_bursting", False) if f_metric else False,
                "burst_multiplier": getattr(f, "burst_multiplier", 1.0)
            }

            nodes.append({
                "id": f.client_id,
                "type": "client",
                "label": f.client_name,
                "category": f.category.value,
                "position": {"x": client_x, "y": client_y},
                "details": client_details
            })

            # Edge from Client to Router (Wi-Fi Uplink)
            edges.append({
                "id": f"edge_{f.client_id}_router",
                "source": f.client_id,
                "target": "node_router",
                "label": f"{f.offered_load_mbps} Mbps Wi-Fi",
                "traffic_category": f.category.value,
                "edge_type": "client_uplink",
                "throughput_mbps": f_metric.throughput_mbps if f_metric else 0.0,
                "offered_load_mbps": f.offered_load_mbps,
                "is_bursting": getattr(f_metric, "is_bursting", False) if f_metric else False,
                "packet_loss_pct": f_metric.packet_loss_pct if f_metric else 0.0,
                "animated": self.engine.is_running,
                "is_congested": is_congested and (f.category == TrafficCategory.BULK or (f_metric and f_metric.packet_loss_pct > 0.0))
            })

        # Core Forwarding Data Plane Edges
        # Router -> Bottleneck Queue
        edges.append({
            "id": "edge_router_queue",
            "source": "node_router",
            "target": "node_queue",
            "label": f"Buffer Ingress ({round(latest.offered_load_mbps, 1)} Mbps)" if latest else "Buffer Ingress",
            "edge_type": "buffer_ingress",
            "throughput_mbps": latest.offered_load_mbps if latest else 0.0,
            "animated": self.engine.is_running,
            "is_congested": is_congested
        })

        # Queue -> Destination Server (The Bottleneck Link)
        edges.append({
            "id": "edge_queue_server",
            "source": "node_queue",
            "target": "node_server",
            "label": f"Bottleneck WAN Link ({self.current_config.bottleneck_capacity_mbps} Mbps)",
            "edge_type": "wan_egress",
            "throughput_mbps": latest.delivered_throughput_mbps if latest else 0.0,
            "capacity_mbps": self.current_config.bottleneck_capacity_mbps,
            "animated": self.engine.is_running,
            "is_congested": is_congested
        })

        # Control & Monitoring Telemetry Edges (Distinct dashed styling)
        edges.append({
            "id": "edge_router_monitor",
            "source": "node_router",
            "target": "node_monitor",
            "label": "Link Telemetry",
            "edge_type": "telemetry",
            "animated": self.engine.is_running,
            "is_congested": False
        })
        edges.append({
            "id": "edge_queue_monitor",
            "source": "node_queue",
            "target": "node_monitor",
            "label": "Queue Telemetry",
            "edge_type": "telemetry",
            "animated": self.engine.is_running,
            "is_congested": False
        })
        edges.append({
            "id": "edge_controller_queue",
            "source": "node_controller",
            "target": "node_queue",
            "label": "QoS Policy Feedback",
            "edge_type": "control",
            "animated": self.engine.is_running,
            "is_congested": False
        })

        return {
            "nodes": nodes,
            "edges": edges,
            "bottleneck_capacity_mbps": self.current_config.bottleneck_capacity_mbps,
            "is_congested": is_congested
        }

    def get_diagnostics(self) -> List[DiagnosisReport]:
        latest = self.engine.last_step_metrics
        if not latest:
            return []
        return CongestionDiagnostics.analyze(latest, self.current_config.bottleneck_capacity_mbps)

    def persist_current_run(self) -> str:
        """Save completed run and snapshots into SQLite."""
        db = SessionLocal()
        exp_id = f"exp_{uuid.uuid4().hex[:10]}"
        try:
            agg = self.engine.get_aggregate_metrics()
            
            # Save configuration record
            cfg_id = f"cfg_{uuid.uuid4().hex[:8]}"
            cfg_model = SimConfigModel(
                id=cfg_id,
                preset_name="custom",
                bottleneck_capacity_mbps=self.current_config.bottleneck_capacity_mbps,
                queue_capacity_bytes=self.current_config.queue_capacity_bytes,
                duration_seconds=self.current_config.duration_seconds,
                time_step_seconds=self.current_config.time_step_seconds,
                random_seed=self.current_config.random_seed,
                qos_mode=self.current_config.qos_mode.value,
                flows_json=json.dumps([f.__dict__ for f in self.current_config.flows], default=str)
            )
            db.add(cfg_model)

            # Save Experiment Record
            exp_model = ExperimentModel(
                id=exp_id,
                name=f"Run - {self.current_config.qos_mode.value.upper()} ({self.current_config.bottleneck_capacity_mbps}Mbps)",
                config_id=cfg_id,
                qos_mode=self.current_config.qos_mode.value,
                random_seed=self.current_config.random_seed,
                duration_seconds=self.current_config.duration_seconds,
                overall_throughput_mbps=agg.overall_throughput_mbps,
                overall_avg_latency_ms=agg.overall_avg_latency_ms,
                overall_p95_latency_ms=agg.overall_p95_latency_ms,
                overall_jitter_ms=agg.overall_jitter_ms,
                overall_packet_loss_pct=agg.overall_packet_loss_pct,
                avg_bandwidth_utilization_pct=agg.avg_bandwidth_utilization_pct,
                peak_bandwidth_utilization_pct=agg.peak_bandwidth_utilization_pct,
                avg_queue_occupancy_pct=agg.avg_queue_occupancy_pct,
                congestion_events_count=agg.congestion_events_count,
                congestion_duration_seconds=agg.congestion_duration_seconds,
                qos_transitions_count=agg.qos_transitions_count,
                aggregate_metrics_json=json.dumps(agg.__dict__, default=str),
                category_metrics_json=json.dumps(agg.category_metrics, default=str)
            )
            db.add(exp_model)

            # Save Metrics Snapshots
            for step in self.engine.history:
                snap = MetricSnapshotModel(
                    experiment_id=exp_id,
                    step_index=step.step_index,
                    simulated_time_sec=step.simulated_time_seconds,
                    qos_mode=step.qos_mode.value,
                    active_policy=step.active_policy,
                    congestion_state=step.congestion_state.value,
                    offered_load_mbps=step.offered_load_mbps,
                    delivered_throughput_mbps=step.delivered_throughput_mbps,
                    link_utilization_pct=step.link_utilization_pct,
                    queue_occupancy_pct=step.queue_occupancy_pct,
                    avg_latency_ms=step.avg_latency_ms,
                    p95_latency_ms=step.p95_latency_ms,
                    jitter_ms=step.jitter_ms,
                    packet_loss_pct=step.packet_loss_pct
                )
                db.add(snap)

            # Save Congestion Events
            for ev in self.engine.congestion_detector.events:
                ce_model = CongestionEventModel(
                    id=f"{exp_id}_{ev.event_id}",
                    experiment_id=exp_id,
                    simulated_time_sec=ev.simulated_time_sec,
                    previous_state=ev.previous_state.value,
                    new_state=ev.new_state.value,
                    reason=ev.reason,
                    trigger_metrics_json=json.dumps(ev.trigger_metrics)
                )
                db.add(ce_model)

            # Save QoS Transitions
            for tr in self.engine.qos_controller.transitions:
                qt_model = QoSTransitionModel(
                    id=f"{exp_id}_{tr.transition_id}",
                    experiment_id=exp_id,
                    simulated_time_sec=tr.simulated_time_sec,
                    previous_policy=tr.previous_policy,
                    new_policy=tr.new_policy,
                    trigger_state=tr.trigger_state.value,
                    reason=tr.reason,
                    policy_params_json=json.dumps(tr.policy_parameters)
                )
                db.add(qt_model)

            db.commit()
            return exp_id
        except Exception as e:
            db.rollback()
            raise e
        finally:
            db.close()

    def run_comparison(self, req: Dict[str, Any]) -> ComparisonResponse:
        """
        Executes Baseline, Static QoS, and Adaptive QoS sequentially under identical conditions:
        - Same capacity
        - Same flows & offered traffic workload
        - Same duration
        - Same random seed
        """
        preset_name = req.get("preset_name")
        use_current = req.get("use_current_scenario", True)
        capacity = float(req.get("bottleneck_capacity_mbps") or self.current_config.bottleneck_capacity_mbps)
        duration = float(req.get("duration_seconds") or self.current_config.duration_seconds)
        seed = int(req.get("random_seed") or self.current_config.random_seed)

        # Use current scenario flows if available and not specifically requesting a fixed preset
        if use_current and self.current_config.flows and (not preset_name or preset_name == "current"):
            flows_to_use = [
                FlowConfig(
                    flow_id=f.flow_id,
                    client_id=f.client_id,
                    client_name=f.client_name,
                    category=f.category,
                    offered_load_mbps=f.offered_load_mbps,
                    packet_size_bytes=f.packet_size_bytes,
                    priority=f.priority,
                    burst_start_sec=getattr(f, "burst_start_sec", 0.0),
                    burst_duration_sec=getattr(f, "burst_duration_sec", 0.0),
                    burst_multiplier=getattr(f, "burst_multiplier", 1.0)
                )
                for f in self.current_config.flows
            ]
        elif preset_name and preset_name.lower() in ("low", "medium", "high"):
            flows_to_use = get_preset_flows(preset_name.lower())
        else:
            flows_to_use = self.current_config.flows if self.current_config.flows else get_preset_flows("high")

        results: Dict[str, ComparisonResultItem] = {}

        for mode in [QoSMode.BASELINE, QoSMode.STATIC_QoS, QoSMode.ADAPTIVE_QoS]:
            cfg = SimulationConfig(
                simulation_id=f"sim_compare_{mode.value}",
                duration_seconds=duration,
                time_step_seconds=self.current_config.time_step_seconds,
                bottleneck_capacity_mbps=capacity,
                queue_capacity_bytes=self.current_config.queue_capacity_bytes,
                random_seed=seed,
                qos_mode=mode,
                flows=flows_to_use
            )

            sim_runner = NetworkSimulationEngine(cfg)
            agg = sim_runner.run_full()

            rt_stats = agg.category_metrics.get(TrafficCategory.REAL_TIME.value, {})
            bulk_stats = agg.category_metrics.get(TrafficCategory.BULK.value, {})

            item = ComparisonResultItem(
                qos_mode=mode.value,
                overall_throughput_mbps=agg.overall_throughput_mbps,
                overall_avg_latency_ms=agg.overall_avg_latency_ms,
                overall_p95_latency_ms=agg.overall_p95_latency_ms,
                overall_jitter_ms=agg.overall_jitter_ms,
                overall_packet_loss_pct=agg.overall_packet_loss_pct,
                avg_bandwidth_utilization_pct=agg.avg_bandwidth_utilization_pct,
                avg_queue_occupancy_pct=agg.avg_queue_occupancy_pct,
                congestion_duration_seconds=agg.congestion_duration_seconds,
                congestion_events_count=agg.congestion_events_count,
                qos_transitions_count=agg.qos_transitions_count,
                real_time_avg_latency_ms=rt_stats.get("avg_latency_ms", 5.0),
                real_time_loss_pct=rt_stats.get("packet_loss_pct", 0.0),
                bulk_avg_latency_ms=bulk_stats.get("avg_latency_ms", 5.0),
                bulk_throughput_mbps=bulk_stats.get("throughput_mbps", 0.0)
            )
            results[mode.value] = item

        recommendations = [
            "Baseline FIFO allows bulk traffic to bloat queues and cause severe packet drops in real-time video/voice.",
            "Static QoS guarantees lowest latency for real-time traffic by serving priority queues first.",
            "Adaptive QoS dynamically clamps bulk bandwidth during congestion bursts, preventing bufferbloat while restoring full throughput during normal traffic."
        ]

        return ComparisonResponse(
            baseline=results[QoSMode.BASELINE.value],
            static_qos=results[QoSMode.STATIC_QoS.value],
            adaptive_qos=results[QoSMode.ADAPTIVE_QoS.value],
            recommendations=recommendations,
            notes=f"Fair comparison executed with identical offered load ({len(flows_to_use)} flows), random seed #{seed}, and link capacity ({capacity} Mbps)."
        )

    def export_csv(self, experiment_id: str) -> str:
        """Generate CSV string of time-series metric snapshots for an experiment."""
        db = SessionLocal()
        try:
            snaps = db.query(MetricSnapshotModel).filter(
                MetricSnapshotModel.experiment_id == experiment_id
            ).order_by(MetricSnapshotModel.step_index.asc()).all()

            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow([
                "step_index",
                "simulated_time_sec",
                "qos_mode",
                "active_policy",
                "congestion_state",
                "offered_load_mbps",
                "delivered_throughput_mbps",
                "link_utilization_pct",
                "queue_occupancy_pct",
                "avg_latency_ms",
                "p95_latency_ms",
                "jitter_ms",
                "packet_loss_pct"
            ])

            for s in snaps:
                writer.writerow([
                    s.step_index,
                    s.simulated_time_sec,
                    s.qos_mode,
                    s.active_policy,
                    s.congestion_state,
                    s.offered_load_mbps,
                    s.delivered_throughput_mbps,
                    s.link_utilization_pct,
                    s.queue_occupancy_pct,
                    s.avg_latency_ms,
                    s.p95_latency_ms,
                    s.jitter_ms,
                    s.packet_loss_pct
                ])

            return output.getvalue()
        finally:
            db.close()


simulation_service = SimulationService()
