"""Discrete-Time Wi-Fi Network Simulation Engine with Micro-Slice Interleaved Processing.

Orchestrates traffic generation, queueing, QoS scheduling, congestion detection,
and metric collection over discrete time steps with high-fidelity micro-slice
interleaving of packet arrival and link transmission.
"""

import math
from typing import List, Dict, Any, Optional
from app.simulation.models import (
    SimulationConfig,
    StepMetrics,
    FlowStepMetrics,
    AggregateMetrics,
    TrafficCategory,
    QoSMode,
    CongestionState,
    Packet
)
from app.simulation.traffic_generator import TrafficGenerator
from app.simulation.queue_manager import QueueManager
from app.simulation.scheduler import (
    FIFOScheduler,
    StaticQoSScheduler,
    AdaptiveQoSScheduler
)
from app.congestion.detector import CongestionDetector
from app.qos.controller import QoSController


class NetworkSimulationEngine:
    def __init__(self, config: SimulationConfig):
        self.config = config
        self.current_step = 0
        self.current_time_sec = 0.0
        self.is_running = False
        self.is_paused = False
        self.is_completed = False

        # Subsystems
        self.traffic_gen = TrafficGenerator(config.flows, config.random_seed)
        self.queue_mgr = QueueManager(config.queue_capacity_bytes, config.qos_mode)
        
        # Schedulers
        self.fifo_scheduler = FIFOScheduler(config.bottleneck_capacity_mbps)
        self.static_scheduler = StaticQoSScheduler(config.bottleneck_capacity_mbps)
        self.adaptive_scheduler = AdaptiveQoSScheduler(config.bottleneck_capacity_mbps)

        # Control & Detection
        self.congestion_detector = CongestionDetector(config)
        self.qos_controller = QoSController(config)

        # History collection
        self.history: List[StepMetrics] = []
        self.last_step_metrics: Optional[StepMetrics] = None
        self.total_congestion_duration_sec = 0.0

        # Cumulative packet trackers for aggregate metrics
        self.all_delivered_delays_sec: List[float] = []
        self.category_delays_sec: Dict[str, List[float]] = {
            TrafficCategory.REAL_TIME.value: [],
            TrafficCategory.BEST_EFFORT.value: [],
            TrafficCategory.BULK.value: []
        }
        self.flow_delays_sec: Dict[str, List[float]] = {}
        self.last_delivered_delay_by_flow: Dict[str, float] = {}
        self.flow_jitter_accum: Dict[str, List[float]] = {}

        # Reset state
        self.reset(config)

    def reset(self, config: Optional[SimulationConfig] = None) -> None:
        """Reset engine state to step 0."""
        if config:
            self.config = config

        self.current_step = 0
        self.current_time_sec = 0.0
        self.is_running = False
        self.is_paused = False
        self.is_completed = False
        self.total_congestion_duration_sec = 0.0

        self.traffic_gen = TrafficGenerator(self.config.flows, self.config.random_seed)
        self.queue_mgr.reset(self.config.queue_capacity_bytes, self.config.qos_mode)

        self.fifo_scheduler.set_capacity(self.config.bottleneck_capacity_mbps)
        self.static_scheduler.set_capacity(self.config.bottleneck_capacity_mbps)
        self.adaptive_scheduler.set_capacity(self.config.bottleneck_capacity_mbps)

        self.congestion_detector.reset(self.config)
        self.qos_controller.reset(self.config)

        self.history.clear()
        self.last_step_metrics = None
        self.all_delivered_delays_sec.clear()
        for cat in self.category_delays_sec:
            self.category_delays_sec[cat].clear()
        self.flow_delays_sec.clear()
        self.last_delivered_delay_by_flow.clear()
        self.flow_jitter_accum.clear()

        for f in self.config.flows:
            self.flow_delays_sec[f.flow_id] = []
            self.flow_jitter_accum[f.flow_id] = []

    def step(self) -> StepMetrics:
        """
        Execute a single discrete simulation step using 10 interleaved micro-slices
        to accurately model continuous arrival, queue occupancy, and link transmission.
        """
        dt = self.config.time_step_seconds
        step_idx = self.current_step
        t_now = self.current_time_sec

        # 1. Generate all offered packets for this time step
        step_packets = self.traffic_gen.generate_step_packets(t_now, dt)
        step_gen_bytes = sum(p.size_bytes for p in step_packets)
        step_offered_load_mbps = (step_gen_bytes * 8.0) / (dt * 1_000_000.0)

        flow_gen_count: Dict[str, int] = {f.flow_id: 0 for f in self.config.flows}
        flow_gen_bytes: Dict[str, int] = {f.flow_id: 0 for f in self.config.flows}
        for p in step_packets:
            flow_gen_count[p.flow_id] += 1
            flow_gen_bytes[p.flow_id] += p.size_bytes

        # 2. Get current policy from QoS Controller
        current_state = self.congestion_detector.current_state
        policy_params = self.qos_controller.evaluate_and_update(
            t_now,
            current_state,
            self.congestion_detector.cooldown_remaining_steps
        )
        dynamic_bulk_limit = policy_params.get("dynamic_bulk_buffer_limit_bytes")

        # 3. Interleaved execution across 10 micro-slices for physical fidelity
        num_slices = 10
        slice_dt = dt / num_slices
        slice_packets: List[List[Packet]] = [[] for _ in range(num_slices)]
        for p in step_packets:
            # Map packet creation time to micro slice
            offset = max(0.0, min(dt - 1e-6, p.creation_time - t_now))
            slice_idx = min(num_slices - 1, int(offset / slice_dt))
            slice_packets[slice_idx].append(p)

        step_admitted_packets: List[Packet] = []
        step_dropped_packets: List[Packet] = []
        step_delivered_packets: List[Packet] = []
        flow_dropped_count: Dict[str, int] = {f.flow_id: 0 for f in self.config.flows}
        flow_dropped_bytes: Dict[str, int] = {f.flow_id: 0 for f in self.config.flows}

        for slice_idx in range(num_slices):
            slice_time = t_now + (slice_idx * slice_dt)
            # A. Enqueue arriving packets for this micro-slice
            for pkt in slice_packets[slice_idx]:
                admitted, reason = self.queue_mgr.enqueue(pkt, dynamic_bulk_limit)
                if admitted:
                    step_admitted_packets.append(pkt)
                else:
                    step_dropped_packets.append(pkt)
                    flow_dropped_count[pkt.flow_id] += 1
                    flow_dropped_bytes[pkt.flow_id] += pkt.size_bytes

            # B. Schedule and transmit queued packets during this micro-slice
            if self.config.qos_mode == QoSMode.BASELINE:
                delivered = self.fifo_scheduler.schedule(self.queue_mgr, slice_time, slice_dt, policy_params)
            elif self.config.qos_mode == QoSMode.STATIC_QoS:
                delivered = self.static_scheduler.schedule(self.queue_mgr, slice_time, slice_dt, policy_params)
            else:
                delivered = self.adaptive_scheduler.schedule(self.queue_mgr, slice_time, slice_dt, policy_params)

            step_delivered_packets.extend(delivered)

        # 4. Measure step performance metrics
        delivered_bytes = sum(p.size_bytes for p in step_delivered_packets)
        delivered_mbps = (delivered_bytes * 8.0) / (dt * 1_000_000.0)
        link_util_pct = min(100.0, (delivered_mbps / max(0.1, self.config.bottleneck_capacity_mbps)) * 100.0)
        queue_occ_pct = self.queue_mgr.occupancy_pct
        queue_occ_bytes = self.queue_mgr.current_bytes

        # Delay & Jitter statistics
        step_delays_ms: List[float] = []
        step_jitters_ms: List[float] = []
        flow_del_count: Dict[str, int] = {f.flow_id: 0 for f in self.config.flows}
        flow_del_bytes: Dict[str, int] = {f.flow_id: 0 for f in self.config.flows}
        flow_step_delays: Dict[str, List[float]] = {f.flow_id: [] for f in self.config.flows}

        for pkt in step_delivered_packets:
            delay_sec = max(0.005, (pkt.delivery_time - pkt.creation_time) if pkt.delivery_time else 0.005)
            delay_ms = delay_sec * 1000.0
            step_delays_ms.append(delay_ms)
            self.all_delivered_delays_sec.append(delay_sec)
            self.category_delays_sec[pkt.category.value].append(delay_sec)

            flow_del_count[pkt.flow_id] += 1
            flow_del_bytes[pkt.flow_id] += pkt.size_bytes
            flow_step_delays[pkt.flow_id].append(delay_ms)
            self.flow_delays_sec[pkt.flow_id].append(delay_sec)

            # Jitter: RFC 3393 |D_i - D_{i-1}|
            if pkt.flow_id in self.last_delivered_delay_by_flow:
                prev_d = self.last_delivered_delay_by_flow[pkt.flow_id]
                jitter_val = abs(delay_ms - prev_d)
                step_jitters_ms.append(jitter_val)
                self.flow_jitter_accum[pkt.flow_id].append(jitter_val)
            self.last_delivered_delay_by_flow[pkt.flow_id] = delay_ms

        step_avg_latency_ms = (sum(step_delays_ms) / len(step_delays_ms)) if step_delays_ms else 5.0
        step_p95_latency_ms = (
            sorted(step_delays_ms)[int(0.95 * len(step_delays_ms))]
            if step_delays_ms else step_avg_latency_ms
        )
        step_jitter_ms = (sum(step_jitters_ms) / len(step_jitters_ms)) if step_jitters_ms else 0.0

        step_total_gen_pkts = len(step_packets)
        step_total_drop_pkts = len(step_dropped_packets)
        step_loss_pct = (
            (step_total_drop_pkts / step_total_gen_pkts) * 100.0
            if step_total_gen_pkts > 0 else 0.0
        )

        # 5. Feed into Congestion Detector
        updated_state = self.congestion_detector.update(
            t_now,
            link_util_pct,
            step_avg_latency_ms,
            queue_occ_pct,
            step_loss_pct
        )

        if updated_state == CongestionState.CONGESTED:
            self.total_congestion_duration_sec += dt

        # 6. Aggregate per-category metrics
        cat_tp_mbps: Dict[str, float] = {}
        cat_lat_ms: Dict[str, float] = {}
        cat_loss_pct: Dict[str, float] = {}

        for cat in [TrafficCategory.REAL_TIME, TrafficCategory.BEST_EFFORT, TrafficCategory.BULK]:
            cat_val = cat.value
            cat_del_pkts = [p for p in step_delivered_packets if p.category == cat]
            cat_gen_pkts = [p for p in step_packets if p.category == cat]
            cat_drop_pkts = [p for p in step_dropped_packets if p.category == cat]

            cat_bytes = sum(p.size_bytes for p in cat_del_pkts)
            cat_tp_mbps[cat_val] = round((cat_bytes * 8.0) / (dt * 1_000_000.0), 3)

            cat_delays = [
                ((p.delivery_time - p.creation_time) * 1000.0)
                for p in cat_del_pkts if p.delivery_time
            ]
            cat_lat_ms[cat_val] = round(sum(cat_delays) / len(cat_delays), 2) if cat_delays else 5.0
            cat_loss_pct[cat_val] = (
                round((len(cat_drop_pkts) / len(cat_gen_pkts)) * 100.0, 2)
                if cat_gen_pkts else 0.0
            )

        # 7. Build per-flow metrics
        flow_metrics_dict: Dict[str, FlowStepMetrics] = {}
        for f in self.config.flows:
            f_delays = flow_step_delays[f.flow_id]
            f_jitters = [
                j for j in self.flow_jitter_accum[f.flow_id][-len(f_delays):]
            ] if f_delays else []

            f_gen_p = flow_gen_count[f.flow_id]
            f_drop_p = flow_dropped_count[f.flow_id]
            f_del_p = flow_del_count[f.flow_id]

            flow_metrics_dict[f.flow_id] = FlowStepMetrics(
                flow_id=f.flow_id,
                category=f.category,
                generated_packets=f_gen_p,
                delivered_packets=f_del_p,
                dropped_packets=f_drop_p,
                generated_bytes=flow_gen_bytes[f.flow_id],
                delivered_bytes=flow_del_bytes[f.flow_id],
                dropped_bytes=flow_dropped_bytes[f.flow_id],
                throughput_mbps=round((flow_del_bytes[f.flow_id] * 8.0) / (dt * 1_000_000.0), 3),
                avg_latency_ms=round(sum(f_delays) / len(f_delays), 2) if f_delays else 5.0,
                p95_latency_ms=round(
                    sorted(f_delays)[int(0.95 * len(f_delays))], 2
                ) if f_delays else 5.0,
                jitter_ms=round(sum(f_jitters) / len(f_jitters), 2) if f_jitters else 0.0,
                packet_loss_pct=round((f_drop_p / f_gen_p) * 100.0, 2) if f_gen_p > 0 else 0.0,
                queue_occupancy_bytes=self.queue_mgr.bytes_by_category.get(f.category, 0)
            )

        step_metrics = StepMetrics(
            step_index=step_idx,
            simulated_time_seconds=round(t_now, 2),
            qos_mode=self.config.qos_mode,
            active_policy=self.qos_controller.active_policy_name,
            congestion_state=updated_state,
            offered_load_mbps=round(step_offered_load_mbps, 3),
            delivered_throughput_mbps=round(delivered_mbps, 3),
            link_utilization_pct=round(link_util_pct, 2),
            queue_occupancy_bytes=queue_occ_bytes,
            queue_occupancy_pct=round(queue_occ_pct, 2),
            avg_latency_ms=round(step_avg_latency_ms, 2),
            p95_latency_ms=round(step_p95_latency_ms, 2),
            jitter_ms=round(step_jitter_ms, 2),
            packet_loss_pct=round(step_loss_pct, 2),
            total_packets_generated=step_total_gen_pkts,
            total_packets_delivered=len(step_delivered_packets),
            total_packets_dropped=step_total_drop_pkts,
            category_throughput_mbps=cat_tp_mbps,
            category_latency_ms=cat_lat_ms,
            category_loss_pct=cat_loss_pct,
            flow_metrics=flow_metrics_dict
        )

        self.history.append(step_metrics)
        self.last_step_metrics = step_metrics
        self.current_step += 1
        self.current_time_sec = round(self.current_time_sec + dt, 4)

        if self.current_time_sec >= self.config.duration_seconds:
            self.is_completed = True
            self.is_running = False

        return step_metrics

    def run_full(self) -> AggregateMetrics:
        """Run entire simulation to completion synchronously."""
        self.is_running = True
        while not self.is_completed:
            self.step()
        return self.get_aggregate_metrics()

    def get_aggregate_metrics(self) -> AggregateMetrics:
        """Compute statistical summary over entire run."""
        total_steps = len(self.history)
        if total_steps == 0:
            return AggregateMetrics()

        total_gen_pkts = sum(m.total_packets_generated for m in self.history)
        total_del_pkts = sum(m.total_packets_delivered for m in self.history)
        total_drop_pkts = sum(m.total_packets_dropped for m in self.history)

        total_sim_sec = max(0.1, self.current_time_sec)
        total_del_bytes = sum(
            sum(fm.delivered_bytes for fm in m.flow_metrics.values())
            for m in self.history
        )
        overall_throughput_mbps = round((total_del_bytes * 8.0) / (total_sim_sec * 1_000_000.0), 3)

        if self.all_delivered_delays_sec:
            delays_ms = [d * 1000.0 for d in self.all_delivered_delays_sec]
            overall_avg_lat = round(sum(delays_ms) / len(delays_ms), 2)
            sorted_delays = sorted(delays_ms)
            p95_idx = min(len(sorted_delays) - 1, int(0.95 * len(sorted_delays)))
            overall_p95_lat = round(sorted_delays[p95_idx], 2)
        else:
            overall_avg_lat = 5.0
            overall_p95_lat = 5.0

        all_jitters = [m.jitter_ms for m in self.history if m.jitter_ms > 0]
        overall_jitter = round(sum(all_jitters) / len(all_jitters), 2) if all_jitters else 0.0

        overall_loss_pct = (
            round((total_drop_pkts / total_gen_pkts) * 100.0, 2)
            if total_gen_pkts > 0 else 0.0
        )

        avg_util = round(sum(m.link_utilization_pct for m in self.history) / total_steps, 2)
        peak_util = round(max((m.link_utilization_pct for m in self.history), default=0.0), 2)
        avg_queue = round(sum(m.queue_occupancy_pct for m in self.history) / total_steps, 2)

        cat_summary: Dict[str, Dict[str, float]] = {}
        for cat in [TrafficCategory.REAL_TIME, TrafficCategory.BEST_EFFORT, TrafficCategory.BULK]:
            cat_name = cat.value
            cat_delays = [d * 1000.0 for d in self.category_delays_sec[cat_name]]
            cat_avg_lat = round(sum(cat_delays) / len(cat_delays), 2) if cat_delays else 5.0
            sorted_cd = sorted(cat_delays) if cat_delays else []
            cat_p95_lat = (
                round(sorted_cd[min(len(sorted_cd) - 1, int(0.95 * len(sorted_cd)))], 2)
                if sorted_cd else cat_avg_lat
            )

            cat_bytes = sum(
                sum(fm.delivered_bytes for fm in m.flow_metrics.values() if fm.category == cat)
                for m in self.history
            )
            cat_tp = round((cat_bytes * 8.0) / (total_sim_sec * 1_000_000.0), 3)

            cat_gen = sum(
                sum(fm.generated_packets for fm in m.flow_metrics.values() if fm.category == cat)
                for m in self.history
            )
            cat_drop = sum(
                sum(fm.dropped_packets for fm in m.flow_metrics.values() if fm.category == cat)
                for m in self.history
            )
            cat_loss = round((cat_drop / cat_gen) * 100.0, 2) if cat_gen > 0 else 0.0

            cat_summary[cat_name] = {
                "throughput_mbps": cat_tp,
                "avg_latency_ms": cat_avg_lat,
                "p95_latency_ms": cat_p95_lat,
                "packet_loss_pct": cat_loss
            }

        return AggregateMetrics(
            total_duration_seconds=round(total_sim_sec, 2),
            total_steps=total_steps,
            total_packets_generated=total_gen_pkts,
            total_packets_delivered=total_del_pkts,
            total_packets_dropped=total_drop_pkts,
            overall_throughput_mbps=overall_throughput_mbps,
            overall_avg_latency_ms=overall_avg_lat,
            overall_p95_latency_ms=overall_p95_lat,
            overall_jitter_ms=overall_jitter,
            overall_packet_loss_pct=overall_loss_pct,
            avg_bandwidth_utilization_pct=avg_util,
            peak_bandwidth_utilization_pct=peak_util,
            avg_queue_occupancy_pct=avg_queue,
            congestion_events_count=len(self.congestion_detector.events),
            congestion_duration_seconds=round(self.total_congestion_duration_sec, 2),
            qos_transitions_count=len(self.qos_controller.transitions),
            category_metrics=cat_summary
        )
