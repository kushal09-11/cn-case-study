"""Automated unit and integration test suite covering all 14 required validation criteria."""

import pytest
from app.simulation.models import (
    SimulationConfig,
    FlowConfig,
    TrafficCategory,
    QoSMode,
    CongestionState
)
from app.simulation.engine import NetworkSimulationEngine
from app.simulation.presets import create_default_config, get_preset_flows
from app.services.simulation_service import SimulationService
from app.congestion.detector import CongestionDetector
from app.qos.controller import QoSController


def test_1_no_traffic():
    """Case 1: No traffic -> no invalid metrics or crashes."""
    config = SimulationConfig(
        duration_seconds=2.0,
        bottleneck_capacity_mbps=50.0,
        qos_mode=QoSMode.BASELINE,
        flows=[]
    )
    engine = NetworkSimulationEngine(config)
    agg = engine.run_full()
    
    assert agg.total_packets_generated == 0
    assert agg.total_packets_delivered == 0
    assert agg.total_packets_dropped == 0
    assert agg.overall_throughput_mbps == 0.0
    assert agg.overall_packet_loss_pct == 0.0
    assert agg.overall_avg_latency_ms >= 0.0


def test_2_low_load():
    """Case 2: Low load -> behaves consistently with an uncongested link."""
    config = create_default_config(preset="low", qos_mode=QoSMode.BASELINE)
    config.duration_seconds = 2.0
    engine = NetworkSimulationEngine(config)
    agg = engine.run_full()

    # Link capacity is 50 Mbps, low load is ~20 Mbps -> uncongested
    assert agg.overall_throughput_mbps > 10.0
    assert agg.overall_packet_loss_pct == 0.0  # Zero drops under low load
    assert agg.avg_bandwidth_utilization_pct < 60.0
    assert agg.avg_queue_occupancy_pct < 10.0
    assert agg.congestion_events_count == 0


def test_3_offered_load_below_capacity():
    """Case 3: Offered load below capacity -> throughput matches traffic model."""
    flows = [
        FlowConfig(
            flow_id="f1",
            client_id="c1",
            client_name="Test Client",
            category=TrafficCategory.BEST_EFFORT,
            offered_load_mbps=25.0,
            packet_size_bytes=1000
        )
    ]
    config = SimulationConfig(
        duration_seconds=3.0,
        bottleneck_capacity_mbps=50.0,
        flows=flows,
        random_seed=123
    )
    engine = NetworkSimulationEngine(config)
    agg = engine.run_full()

    # Offered ~25 Mbps on 50 Mbps link -> throughput within ~10% of 25 Mbps
    assert 22.0 <= agg.overall_throughput_mbps <= 28.0
    assert agg.overall_packet_loss_pct == 0.0


def test_4_offered_load_above_capacity():
    """Case 4: Offered load above capacity -> queues grow or saturate, congestion emerges."""
    flows = [
        FlowConfig(
            flow_id="f1",
            client_id="c1",
            client_name="Overload Flow",
            category=TrafficCategory.BULK,
            offered_load_mbps=90.0,
            packet_size_bytes=1500
        )
    ]
    config = SimulationConfig(
        duration_seconds=3.0,
        bottleneck_capacity_mbps=40.0,  # 90 Mbps offered on 40 Mbps link
        queue_capacity_bytes=100_000,
        flows=flows
    )
    engine = NetworkSimulationEngine(config)
    agg = engine.run_full()

    assert agg.peak_bandwidth_utilization_pct >= 90.0
    assert agg.total_packets_dropped > 0
    assert agg.overall_packet_loss_pct > 0.0
    assert engine.congestion_detector.current_state in (CongestionState.CONGESTED, CongestionState.WARNING)


def test_5_queue_limit_reached_tail_drops():
    """Case 5: Queue limit reached -> packet drops recorded with 0-100% loss bounds."""
    flows = [
        FlowConfig(
            flow_id="f1",
            client_id="c1",
            client_name="Burst",
            category=TrafficCategory.BULK,
            offered_load_mbps=100.0,
            packet_size_bytes=1500
        )
    ]
    config = SimulationConfig(
        duration_seconds=2.0,
        bottleneck_capacity_mbps=20.0,
        queue_capacity_bytes=20_000,  # very small buffer
        flows=flows
    )
    engine = NetworkSimulationEngine(config)
    agg = engine.run_full()

    assert agg.total_packets_dropped > 0
    assert 0.0 <= agg.overall_packet_loss_pct <= 100.0


def test_6_static_qos_prioritization():
    """Case 6: Static QoS -> Real-time traffic prioritized over bulk traffic."""
    flows = [
        FlowConfig(
            flow_id="f_rt",
            client_id="c_rt",
            client_name="VoIP",
            category=TrafficCategory.REAL_TIME,
            offered_load_mbps=10.0,
            packet_size_bytes=250,
            priority=1
        ),
        FlowConfig(
            flow_id="f_bulk",
            client_id="c_bulk",
            client_name="FTP",
            category=TrafficCategory.BULK,
            offered_load_mbps=80.0,
            packet_size_bytes=1500,
            priority=3
        )
    ]
    # Run in Baseline FIFO
    cfg_fifo = SimulationConfig(
        duration_seconds=3.0,
        bottleneck_capacity_mbps=40.0,
        queue_capacity_bytes=100_000,
        qos_mode=QoSMode.BASELINE,
        flows=flows,
        random_seed=42
    )
    eng_fifo = NetworkSimulationEngine(cfg_fifo)
    agg_fifo = eng_fifo.run_full()

    # Run in Static QoS
    cfg_static = SimulationConfig(
        duration_seconds=3.0,
        bottleneck_capacity_mbps=40.0,
        queue_capacity_bytes=100_000,
        qos_mode=QoSMode.STATIC_QoS,
        flows=flows,
        random_seed=42
    )
    eng_static = NetworkSimulationEngine(cfg_static)
    agg_static = eng_static.run_full()

    rt_lat_fifo = agg_fifo.category_metrics[TrafficCategory.REAL_TIME.value]["avg_latency_ms"]
    rt_lat_static = agg_static.category_metrics[TrafficCategory.REAL_TIME.value]["avg_latency_ms"]

    # In Static QoS, Real-time queue is drained first, so its latency is significantly lower!
    assert rt_lat_static < rt_lat_fifo


def test_7_adaptive_qos_triggers_policy_change():
    """Case 7: Adaptive QoS -> Congestion triggers dynamic policy transition."""
    config = create_default_config(preset="high", qos_mode=QoSMode.ADAPTIVE_QoS)
    config.duration_seconds = 4.0
    config.bottleneck_capacity_mbps = 40.0  # high load offered is ~82 Mbps
    engine = NetworkSimulationEngine(config)
    agg = engine.run_full()

    assert agg.qos_transitions_count > 0
    assert any("Bulk Throttled" in t.new_policy for t in engine.qos_controller.transitions)


def test_8_and_9_recovery_and_cooldown():
    """Cases 8 & 9: Recovery after clear conditions & Cooldown preventing rapid oscillation."""
    config = SimulationConfig(
        duration_seconds=5.0,
        adaptive_recovery_steps=5,
        adaptive_cooldown_steps=10
    )
    detector = CongestionDetector(config)

    # Trigger congestion
    detector.update(0.1, step_utilization_pct=98.0, step_avg_latency_ms=80.0, step_queue_occupancy_pct=85.0, step_packet_loss_pct=5.0)
    detector.update(0.2, step_utilization_pct=98.0, step_avg_latency_ms=80.0, step_queue_occupancy_pct=85.0, step_packet_loss_pct=5.0)
    assert detector.current_state == CongestionState.CONGESTED

    # Supply low load steps until RECOVERING state entered
    t = 0.3
    while detector.current_state != CongestionState.RECOVERING and t < 2.0:
        detector.update(t, step_utilization_pct=20.0, step_avg_latency_ms=5.0, step_queue_occupancy_pct=0.0, step_packet_loss_pct=0.0)
        t = round(t + 0.1, 2)
    assert detector.current_state == CongestionState.RECOVERING

    # Step through remaining recovery steps (adaptive_recovery_steps = 5)
    for _ in range(5):
        detector.update(t, step_utilization_pct=20.0, step_avg_latency_ms=5.0, step_queue_occupancy_pct=0.0, step_packet_loss_pct=0.0)
        t = round(t + 0.1, 2)

    assert detector.current_state == CongestionState.NORMAL
    # Cooldown should be active
    assert detector.cooldown_remaining_steps > 0


def test_10_repeatability():
    """Case 10: Repeatability -> Identical configuration and seed produces exact same numbers."""
    cfg1 = create_default_config("high", QoSMode.BASELINE)
    cfg1.duration_seconds = 2.0
    cfg1.random_seed = 999
    
    eng1 = NetworkSimulationEngine(cfg1)
    agg1 = eng1.run_full()

    cfg2 = create_default_config("high", QoSMode.BASELINE)
    cfg2.duration_seconds = 2.0
    cfg2.random_seed = 999
    
    eng2 = NetworkSimulationEngine(cfg2)
    agg2 = eng2.run_full()

    assert agg1.overall_throughput_mbps == agg2.overall_throughput_mbps
    assert agg1.overall_avg_latency_ms == agg2.overall_avg_latency_ms
    assert agg1.total_packets_delivered == agg2.total_packets_delivered
    assert agg1.total_packets_dropped == agg2.total_packets_dropped


def test_11_metric_validity():
    """Case 11: Metric validity -> No invalid percentages, no negative delays."""
    config = create_default_config("high", QoSMode.ADAPTIVE_QoS)
    config.duration_seconds = 3.0
    engine = NetworkSimulationEngine(config)
    agg = engine.run_full()

    assert 0.0 <= agg.overall_packet_loss_pct <= 100.0
    assert 0.0 <= agg.avg_bandwidth_utilization_pct <= 100.0
    assert 0.0 <= agg.peak_bandwidth_utilization_pct <= 100.0
    assert 0.0 <= agg.avg_queue_occupancy_pct <= 100.0
    assert agg.overall_avg_latency_ms > 0.0
    assert agg.overall_p95_latency_ms >= agg.overall_avg_latency_ms or agg.overall_p95_latency_ms > 0.0
    assert agg.overall_jitter_ms >= 0.0
    assert agg.overall_throughput_mbps <= config.bottleneck_capacity_mbps * 1.05


def test_12_comparison_runner():
    """Case 12: Comparison runner executes all 3 modes under equivalent conditions."""
    svc = SimulationService()
    res = svc.run_comparison({
        "preset_name": "high",
        "bottleneck_capacity_mbps": 45.0,
        "duration_seconds": 3.0,
        "random_seed": 777
    })
    assert res.baseline.qos_mode == "baseline"
    assert res.static_qos.qos_mode == "static_qos"
    assert res.adaptive_qos.qos_mode == "adaptive_qos"
    # Real-time latency in static QoS should be lower than baseline
    assert res.static_qos.real_time_avg_latency_ms <= res.baseline.real_time_avg_latency_ms


def test_13_and_14_lifecycle_and_persistence():
    """Cases 13 & 14: Engine lifecycle and SQLite persistence."""
    svc = SimulationService()
    cfg = create_default_config("low", QoSMode.BASELINE)
    cfg.duration_seconds = 2.0
    svc.update_config(cfg)

    # Step simulation
    for _ in range(5):
        svc.engine.step()
    assert svc.engine.current_step == 5
    
    # Reset
    svc.engine.reset(cfg)
    assert svc.engine.current_step == 0
    assert svc.engine.last_step_metrics is None

    # Run full & persist
    svc.engine.run_full()
    exp_id = svc.persist_current_run()
    assert exp_id.startswith("exp_")

    # CSV export
    csv_text = svc.export_csv(exp_id)
    assert "step_index,simulated_time_sec" in csv_text
    assert len(csv_text.splitlines()) > 2
