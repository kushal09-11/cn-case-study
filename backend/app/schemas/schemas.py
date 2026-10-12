"""Pydantic request and response schemas for FastAPI endpoints."""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from app.simulation.models import TrafficCategory, QoSMode, CongestionState


class FlowConfigSchema(BaseModel):
    flow_id: str
    client_id: str
    client_name: str
    category: TrafficCategory
    offered_load_mbps: float
    packet_size_bytes: int
    priority: int = 2


class SimConfigSchema(BaseModel):
    simulation_id: str = "sim_default"
    preset_name: str = "high"
    duration_seconds: float = 30.0
    time_step_seconds: float = 0.1
    bottleneck_capacity_mbps: float = 50.0
    queue_capacity_bytes: int = 500_000
    random_seed: int = 42
    qos_mode: QoSMode = QoSMode.BASELINE
    
    threshold_utilization_warning: float = 85.0
    threshold_utilization_congested: float = 95.0
    threshold_latency_warning_ms: float = 40.0
    threshold_latency_congested_ms: float = 65.0
    threshold_queue_occupancy_warning: float = 40.0
    threshold_queue_occupancy_congested: float = 70.0
    threshold_packet_loss_congested: float = 3.0
    
    adaptive_recovery_steps: int = 10
    adaptive_cooldown_steps: int = 15
    adaptive_bulk_rate_limit_ratio: float = 0.20
    
    flows: List[FlowConfigSchema] = []


class SimConfigUpdateSchema(BaseModel):
    preset_name: Optional[str] = None
    bottleneck_capacity_mbps: Optional[float] = None
    queue_capacity_bytes: Optional[int] = None
    duration_seconds: Optional[float] = None
    time_step_seconds: Optional[float] = None
    random_seed: Optional[int] = None
    qos_mode: Optional[QoSMode] = None
    flows: Optional[List[FlowConfigSchema]] = None
    threshold_utilization_congested: Optional[float] = None
    threshold_queue_occupancy_congested: Optional[float] = None


class FlowStepMetricsSchema(BaseModel):
    flow_id: str
    category: TrafficCategory
    generated_packets: int
    delivered_packets: int
    dropped_packets: int
    throughput_mbps: float
    avg_latency_ms: float
    p95_latency_ms: float
    jitter_ms: float
    packet_loss_pct: float
    queue_occupancy_bytes: int
    cumulative_generated_packets: int = 0
    cumulative_delivered_packets: int = 0
    cumulative_dropped_packets: int = 0
    cumulative_loss_pct: float = 0.0


class StepMetricsSchema(BaseModel):
    step_index: int
    simulated_time_seconds: float
    qos_mode: QoSMode
    active_policy: str
    congestion_state: CongestionState
    offered_load_mbps: float
    delivered_throughput_mbps: float
    link_utilization_pct: float
    queue_occupancy_bytes: int
    queue_occupancy_pct: float
    avg_latency_ms: float
    p95_latency_ms: float
    jitter_ms: float
    packet_loss_pct: float
    total_packets_generated: int
    total_packets_delivered: int
    total_packets_dropped: int
    cumulative_packets_generated: int = 0
    cumulative_packets_delivered: int = 0
    cumulative_packets_dropped: int = 0
    cumulative_loss_pct: float = 0.0
    moving_avg_metrics: Dict[str, float] = {}
    category_throughput_mbps: Dict[str, float]
    category_latency_ms: Dict[str, float]
    category_loss_pct: Dict[str, float]
    flow_metrics: Dict[str, FlowStepMetricsSchema]


class SimulationStatusResponse(BaseModel):
    is_running: bool
    is_paused: bool
    is_completed: bool
    current_step: int
    current_time_seconds: float
    duration_seconds: float
    qos_mode: QoSMode
    active_policy: str
    congestion_state: CongestionState
    moving_avg_metrics: Dict[str, float] = {}
    latest_metrics: Optional[StepMetricsSchema] = None


class TopologyNode(BaseModel):
    id: str
    type: str  # "router", "client", "controller", "monitor"
    label: str
    category: Optional[str] = None
    details: Dict[str, Any] = {}
    position: Dict[str, float]


class TopologyEdge(BaseModel):
    id: str
    source: str
    target: str
    label: Optional[str] = None
    is_congested: bool = False
    animated: bool = True
    traffic_category: Optional[str] = None


class TopologyResponse(BaseModel):
    nodes: List[TopologyNode]
    edges: List[TopologyEdge]
    bottleneck_capacity_mbps: float
    is_congested: bool


class ComparisonRequest(BaseModel):
    preset_name: str = "high"
    bottleneck_capacity_mbps: float = 50.0
    duration_seconds: float = 20.0
    random_seed: int = 42


class ComparisonResultItem(BaseModel):
    qos_mode: str
    overall_throughput_mbps: float
    overall_avg_latency_ms: float
    overall_p95_latency_ms: float
    overall_jitter_ms: float
    overall_packet_loss_pct: float
    avg_bandwidth_utilization_pct: float
    peak_bandwidth_utilization_pct: float = 0.0
    avg_queue_occupancy_pct: float
    peak_queue_occupancy_pct: float = 0.0
    congestion_duration_seconds: float
    congestion_events_count: int
    qos_transitions_count: int
    # Per-class breakdowns
    real_time_avg_latency_ms: float
    real_time_p95_latency_ms: float = 5.0
    real_time_loss_pct: float
    rt_throughput_mbps: float = 0.0
    real_time_throughput_mbps: float = 0.0
    best_effort_avg_latency_ms: float = 5.0
    best_effort_loss_pct: float = 0.0
    be_throughput_mbps: float = 0.0
    best_effort_throughput_mbps: float = 0.0
    bulk_avg_latency_ms: float
    bulk_p95_latency_ms: float = 5.0
    bulk_throughput_mbps: float
    bulk_loss_pct: float = 0.0


class ComparisonResponse(BaseModel):
    baseline: ComparisonResultItem
    static_qos: ComparisonResultItem
    adaptive_qos: ComparisonResultItem
    recommendations: List[str]
    notes: str


class AdaptiveDecisionResponse(BaseModel):
    current_state: str
    active_policy: str
    previous_policy: str
    reason: str
    trigger_evidence: Dict[str, Any]
    affected_classes: List[str]
    affected_flows: List[str]
    bulk_restriction: str
    recovery_condition: str
    recovery_status: str
    cooldown_status: str
    action_applied: bool
    simulator_verified: bool
