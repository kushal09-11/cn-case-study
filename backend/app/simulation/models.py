"""Data models and enums for the discrete-time Wi-Fi network simulation engine."""

from enum import Enum
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any


class TrafficCategory(str, Enum):
    REAL_TIME = "real_time"      # Video calls, conferencing, gaming (small packets, delay-sensitive)
    BEST_EFFORT = "best_effort"  # Web browsing, streaming (medium packets)
    BULK = "bulk"                # Large downloads, backups (large packets, throughput-hungry)


class QoSMode(str, Enum):
    BASELINE = "baseline"        # FIFO single queue, neutral scheduling
    STATIC_QoS = "static_qos"    # Strict priority / Class-based fixed prioritization
    ADAPTIVE_QoS = "adaptive_qos"# Congestion-driven dynamic throttling & priority guarantees


class CongestionState(str, Enum):
    NORMAL = "normal"
    WARNING = "warning"
    CONGESTED = "congested"
    RECOVERING = "recovering"


@dataclass
class Packet:
    packet_id: int
    flow_id: str
    category: TrafficCategory
    size_bytes: int
    creation_time: float      # Simulated time when packet was generated (seconds)
    service_start_time: Optional[float] = None
    delivery_time: Optional[float] = None
    is_dropped: bool = False
    drop_reason: Optional[str] = None


@dataclass
class FlowConfig:
    flow_id: str
    client_id: str
    client_name: str
    category: TrafficCategory
    offered_load_mbps: float
    packet_size_bytes: int
    priority: int = 2  # 1: Real-time (highest), 2: Best-effort, 3: Bulk (lowest)
    burst_start_sec: float = 0.0      # Start time of traffic surge/burst (seconds)
    burst_duration_sec: float = 0.0   # Duration of burst (seconds)
    burst_multiplier: float = 1.0     # Multiplier applied to offered load during burst


@dataclass
class SimulationConfig:
    simulation_id: str = "sim_default"
    duration_seconds: float = 30.0
    time_step_seconds: float = 0.1   # 100ms per discrete simulation step
    bottleneck_capacity_mbps: float = 50.0  # Shared virtual wireless AP bottleneck link
    queue_capacity_bytes: int = 500_000     # 500 KB finite buffer limit
    random_seed: int = 42
    qos_mode: QoSMode = QoSMode.BASELINE
    scenario_name: str = "Default High Load"
    
    # Congestion detection thresholds
    threshold_utilization_warning: float = 85.0
    threshold_utilization_congested: float = 95.0
    threshold_latency_warning_ms: float = 40.0
    threshold_latency_congested_ms: float = 65.0
    threshold_queue_occupancy_warning: float = 40.0
    threshold_queue_occupancy_congested: float = 70.0
    threshold_packet_loss_congested: float = 3.0  # %
    
    # Adaptive Controller parameters
    adaptive_recovery_steps: int = 10     # 10 steps = 1.0s without congestion triggers to recover
    adaptive_cooldown_steps: int = 15     # 15 steps = 1.5s hysteresis cooldown before re-switching
    adaptive_bulk_rate_limit_ratio: float = 0.20  # Limit bulk share to 20% during congestion
    
    flows: List[FlowConfig] = field(default_factory=list)


@dataclass
class FlowStepMetrics:
    flow_id: str
    category: TrafficCategory
    generated_packets: int = 0
    delivered_packets: int = 0
    dropped_packets: int = 0
    generated_bytes: int = 0
    delivered_bytes: int = 0
    dropped_bytes: int = 0
    throughput_mbps: float = 0.0
    avg_latency_ms: float = 0.0
    p95_latency_ms: float = 0.0
    jitter_ms: float = 0.0
    packet_loss_pct: float = 0.0
    queue_occupancy_bytes: int = 0
    is_bursting: bool = False


@dataclass
class StepMetrics:
    step_index: int
    simulated_time_seconds: float
    qos_mode: QoSMode
    active_policy: str
    congestion_state: CongestionState
    
    # Aggregate link metrics
    offered_load_mbps: float = 0.0
    delivered_throughput_mbps: float = 0.0
    link_utilization_pct: float = 0.0
    queue_occupancy_bytes: int = 0
    queue_occupancy_pct: float = 0.0
    
    # Latency & reliability metrics
    avg_latency_ms: float = 0.0
    p95_latency_ms: float = 0.0
    jitter_ms: float = 0.0
    packet_loss_pct: float = 0.0
    
    # Counters
    total_packets_generated: int = 0
    total_packets_delivered: int = 0
    total_packets_dropped: int = 0
    
    # Per-category metrics
    category_throughput_mbps: Dict[str, float] = field(default_factory=dict)
    category_latency_ms: Dict[str, float] = field(default_factory=dict)
    category_loss_pct: Dict[str, float] = field(default_factory=dict)
    
    # Per-flow metrics
    flow_metrics: Dict[str, FlowStepMetrics] = field(default_factory=dict)


@dataclass
class AggregateMetrics:
    total_duration_seconds: float = 0.0
    total_steps: int = 0
    total_packets_generated: int = 0
    total_packets_delivered: int = 0
    total_packets_dropped: int = 0
    overall_throughput_mbps: float = 0.0
    overall_avg_latency_ms: float = 0.0
    overall_p95_latency_ms: float = 0.0
    overall_jitter_ms: float = 0.0
    overall_packet_loss_pct: float = 0.0
    avg_bandwidth_utilization_pct: float = 0.0
    peak_bandwidth_utilization_pct: float = 0.0
    avg_queue_occupancy_pct: float = 0.0
    congestion_events_count: int = 0
    congestion_duration_seconds: float = 0.0
    qos_transitions_count: int = 0
    
    category_metrics: Dict[str, Dict[str, float]] = field(default_factory=dict)
