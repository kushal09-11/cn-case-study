"""SQLAlchemy ORM models for persistent storage."""

import json
from datetime import datetime
from sqlalchemy import Column, Integer, Float, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.database.db import Base


class SimConfigModel(Base):
    __tablename__ = "simulation_configs"

    id = Column(String, primary_key=True, index=True)
    preset_name = Column(String, default="high")
    bottleneck_capacity_mbps = Column(Float, default=50.0)
    queue_capacity_bytes = Column(Integer, default=500_000)
    duration_seconds = Column(Float, default=30.0)
    time_step_seconds = Column(Float, default=0.1)
    random_seed = Column(Integer, default=42)
    qos_mode = Column(String, default="baseline")
    flows_json = Column(Text, default="[]")
    thresholds_json = Column(Text, default="{}")
    created_at = Column(DateTime, default=datetime.utcnow)


class ExperimentModel(Base):
    __tablename__ = "experiments"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, default="Simulation Experiment")
    config_id = Column(String, ForeignKey("simulation_configs.id"), nullable=True)
    qos_mode = Column(String, default="baseline")
    random_seed = Column(Integer, default=42)
    duration_seconds = Column(Float, default=30.0)
    
    # Statistical performance summary
    overall_throughput_mbps = Column(Float, default=0.0)
    overall_avg_latency_ms = Column(Float, default=0.0)
    overall_p95_latency_ms = Column(Float, default=0.0)
    overall_jitter_ms = Column(Float, default=0.0)
    overall_packet_loss_pct = Column(Float, default=0.0)
    avg_bandwidth_utilization_pct = Column(Float, default=0.0)
    peak_bandwidth_utilization_pct = Column(Float, default=0.0)
    avg_queue_occupancy_pct = Column(Float, default=0.0)
    
    congestion_events_count = Column(Integer, default=0)
    congestion_duration_seconds = Column(Float, default=0.0)
    qos_transitions_count = Column(Integer, default=0)
    
    aggregate_metrics_json = Column(Text, default="{}")
    category_metrics_json = Column(Text, default="{}")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    metrics = relationship("MetricSnapshotModel", back_populates="experiment", cascade="all, delete-orphan")
    congestion_events = relationship("CongestionEventModel", back_populates="experiment", cascade="all, delete-orphan")
    qos_transitions = relationship("QoSTransitionModel", back_populates="experiment", cascade="all, delete-orphan")


class MetricSnapshotModel(Base):
    __tablename__ = "metric_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    experiment_id = Column(String, ForeignKey("experiments.id"), index=True)
    step_index = Column(Integer)
    simulated_time_sec = Column(Float)
    qos_mode = Column(String)
    active_policy = Column(String)
    congestion_state = Column(String)
    offered_load_mbps = Column(Float)
    delivered_throughput_mbps = Column(Float)
    link_utilization_pct = Column(Float)
    queue_occupancy_pct = Column(Float)
    avg_latency_ms = Column(Float)
    p95_latency_ms = Column(Float)
    jitter_ms = Column(Float)
    packet_loss_pct = Column(Float)
    flow_metrics_json = Column(Text, default="{}")

    experiment = relationship("ExperimentModel", back_populates="metrics")


class CongestionEventModel(Base):
    __tablename__ = "congestion_events"

    id = Column(String, primary_key=True, index=True)
    experiment_id = Column(String, ForeignKey("experiments.id"), index=True)
    simulated_time_sec = Column(Float)
    previous_state = Column(String)
    new_state = Column(String)
    reason = Column(Text)
    trigger_metrics_json = Column(Text, default="{}")

    experiment = relationship("ExperimentModel", back_populates="congestion_events")


class QoSTransitionModel(Base):
    __tablename__ = "qos_transitions"

    id = Column(String, primary_key=True, index=True)
    experiment_id = Column(String, ForeignKey("experiments.id"), index=True)
    simulated_time_sec = Column(Float)
    previous_policy = Column(String)
    new_policy = Column(String)
    trigger_state = Column(String)
    reason = Column(Text)
    policy_params_json = Column(Text, default="{}")

    experiment = relationship("ExperimentModel", back_populates="qos_transitions")
