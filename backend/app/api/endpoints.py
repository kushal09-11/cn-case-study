"""FastAPI REST API routes and WebSocket endpoint."""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Response, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.database.models import (
    ExperimentModel,
    MetricSnapshotModel,
    CongestionEventModel,
    QoSTransitionModel
)
from app.schemas.schemas import (
    SimConfigSchema,
    SimConfigUpdateSchema,
    SimulationStatusResponse,
    TopologyResponse,
    ComparisonRequest,
    ComparisonResponse
)
from app.services.simulation_service import simulation_service
from app.simulation.presets import create_default_config, get_preset_flows
from app.simulation.models import SimulationConfig, FlowConfig, QoSMode

router = APIRouter()


@router.get("/health")
def get_health():
    return {
        "status": "healthy",
        "service": "Adaptive Wi-Fi Congestion & QoS Simulation Engine",
        "version": "1.0.0"
    }


@router.get("/config")
def get_config():
    cfg = simulation_service.current_config
    return {
        "simulation_id": cfg.simulation_id,
        "preset_name": cfg.preset_name,
        "duration_seconds": cfg.duration_seconds,
        "time_step_seconds": cfg.time_step_seconds,
        "bottleneck_capacity_mbps": cfg.bottleneck_capacity_mbps,
        "queue_capacity_bytes": cfg.queue_capacity_bytes,
        "random_seed": cfg.random_seed,
        "qos_mode": cfg.qos_mode.value,
        "threshold_utilization_warning": cfg.threshold_utilization_warning,
        "threshold_utilization_congested": cfg.threshold_utilization_congested,
        "threshold_latency_warning_ms": cfg.threshold_latency_warning_ms,
        "threshold_latency_congested_ms": cfg.threshold_latency_congested_ms,
        "threshold_queue_occupancy_warning": cfg.threshold_queue_occupancy_warning,
        "threshold_queue_occupancy_congested": cfg.threshold_queue_occupancy_congested,
        "threshold_packet_loss_congested": cfg.threshold_packet_loss_congested,
        "adaptive_bulk_rate_limit_ratio": cfg.adaptive_bulk_rate_limit_ratio,
        "adaptive_recovery_steps": cfg.adaptive_recovery_steps,
        "adaptive_cooldown_steps": cfg.adaptive_cooldown_steps,
        "flows": [f.__dict__ for f in cfg.flows]
    }


@router.put("/config")
def update_config(payload: SimConfigUpdateSchema):
    if payload.preset_name:
        simulation_service.set_preset(payload.preset_name, payload.qos_mode)
    
    cfg = simulation_service.current_config
    if payload.bottleneck_capacity_mbps is not None:
        cfg.bottleneck_capacity_mbps = max(1.0, payload.bottleneck_capacity_mbps)
    if payload.queue_capacity_bytes is not None:
        cfg.queue_capacity_bytes = max(1000, payload.queue_capacity_bytes)
    if payload.duration_seconds is not None:
        cfg.duration_seconds = max(1.0, payload.duration_seconds)
    if payload.time_step_seconds is not None:
        cfg.time_step_seconds = max(0.01, min(1.0, payload.time_step_seconds))
    if payload.random_seed is not None:
        cfg.random_seed = payload.random_seed
    if payload.qos_mode is not None:
        cfg.qos_mode = payload.qos_mode
    if payload.threshold_utilization_congested is not None:
        cfg.threshold_utilization_congested = payload.threshold_utilization_congested
    if payload.threshold_queue_occupancy_congested is not None:
        cfg.threshold_queue_occupancy_congested = payload.threshold_queue_occupancy_congested
    if payload.flows is not None:
        cfg.flows = [
            FlowConfig(
                flow_id=f.flow_id,
                client_id=f.client_id,
                client_name=f.client_name,
                category=f.category,
                offered_load_mbps=f.offered_load_mbps,
                packet_size_bytes=f.packet_size_bytes,
                priority=f.priority
            )
            for f in payload.flows
        ]

    simulation_service.update_config(cfg)
    return {"message": "Configuration updated successfully", "config": get_config()}


@router.post("/simulation/start")
async def start_simulation():
    await simulation_service.start()
    return {"message": "Simulation started", "status": simulation_service.get_status_dict()}


@router.post("/simulation/pause")
async def pause_simulation():
    await simulation_service.pause()
    return {"message": "Simulation paused", "status": simulation_service.get_status_dict()}


@router.post("/simulation/resume")
async def resume_simulation():
    await simulation_service.resume()
    return {"message": "Simulation resumed", "status": simulation_service.get_status_dict()}


@router.post("/simulation/stop")
async def stop_simulation():
    await simulation_service.stop()
    return {"message": "Simulation stopped", "status": simulation_service.get_status_dict()}


@router.post("/simulation/reset")
async def reset_simulation():
    await simulation_service.reset()
    return {"message": "Simulation reset", "status": simulation_service.get_status_dict()}


@router.get("/simulation/status")
def get_simulation_status():
    return simulation_service.get_status_dict()


@router.get("/metrics/current")
def get_current_metrics():
    latest = simulation_service.engine.last_step_metrics
    if not latest:
        return {"metrics": None, "message": "Simulation not yet started or stepped"}
    return {"metrics": latest.__dict__}


@router.get("/metrics/history")
def get_metrics_history():
    history = simulation_service.engine.history
    return {
        "count": len(history),
        "history": [
            {
                "step_index": h.step_index,
                "simulated_time_seconds": h.simulated_time_seconds,
                "qos_mode": h.qos_mode.value,
                "active_policy": h.active_policy,
                "congestion_state": h.congestion_state.value,
                "offered_load_mbps": h.offered_load_mbps,
                "delivered_throughput_mbps": h.delivered_throughput_mbps,
                "link_utilization_pct": h.link_utilization_pct,
                "queue_occupancy_pct": h.queue_occupancy_pct,
                "queue_occupancy_bytes": h.queue_occupancy_bytes,
                "avg_latency_ms": h.avg_latency_ms,
                "p95_latency_ms": h.p95_latency_ms,
                "jitter_ms": h.jitter_ms,
                "packet_loss_pct": h.packet_loss_pct,
                "category_throughput_mbps": h.category_throughput_mbps,
                "category_latency_ms": h.category_latency_ms,
                "category_loss_pct": h.category_loss_pct
            }
            for h in history
        ]
    }


@router.get("/topology")
def get_topology():
    return simulation_service.get_topology()


@router.get("/congestion/events")
def get_congestion_events():
    events = simulation_service.engine.congestion_detector.events
    return {
        "current_state": simulation_service.engine.congestion_detector.current_state.value,
        "events": [e.__dict__ for e in events]
    }


@router.get("/congestion/diagnostics")
def get_congestion_diagnostics():
    return {"diagnostics": [d.dict() for d in simulation_service.get_diagnostics()]}


@router.get("/qos/status")
def get_qos_status():
    controller = simulation_service.engine.qos_controller
    detector = simulation_service.engine.congestion_detector
    return {
        "qos_mode": simulation_service.current_config.qos_mode.value,
        "active_policy": controller.active_policy_name,
        "is_throttling_bulk": controller.is_throttling_bulk,
        "bulk_rate_limit_ratio": simulation_service.current_config.adaptive_bulk_rate_limit_ratio,
        "recovery_steps": simulation_service.current_config.adaptive_recovery_steps,
        "cooldown_steps": simulation_service.current_config.adaptive_cooldown_steps,
        "recovery_progress": detector.recovery_progress,
        "transitions_count": len(controller.transitions),
        "latest_decision": controller.latest_decision
    }


@router.get("/qos/decision")
def get_qos_decision():
    controller = simulation_service.engine.qos_controller
    detector = simulation_service.engine.congestion_detector
    return {
        "latest_decision": controller.latest_decision,
        "recovery_progress": detector.recovery_progress,
        "is_throttling_bulk": controller.is_throttling_bulk,
        "active_policy": controller.active_policy_name
    }


@router.get("/qos/history")
def get_qos_history():
    transitions = simulation_service.engine.qos_controller.transitions
    return {
        "count": len(transitions),
        "transitions": [t.__dict__ for t in transitions]
    }


@router.post("/experiments/run-comparison")
def run_comparison(req: ComparisonRequest):
    result = simulation_service.run_comparison(req.model_dump())
    return result


@router.get("/experiments")
def list_experiments(db: Session = Depends(get_db)):
    experiments = db.query(ExperimentModel).order_by(ExperimentModel.created_at.desc()).limit(20).all()
    return [
        {
            "id": exp.id,
            "name": exp.name,
            "qos_mode": exp.qos_mode,
            "random_seed": exp.random_seed,
            "duration_seconds": exp.duration_seconds,
            "overall_throughput_mbps": exp.overall_throughput_mbps,
            "overall_avg_latency_ms": exp.overall_avg_latency_ms,
            "overall_p95_latency_ms": exp.overall_p95_latency_ms,
            "overall_jitter_ms": exp.overall_jitter_ms,
            "overall_packet_loss_pct": exp.overall_packet_loss_pct,
            "avg_bandwidth_utilization_pct": exp.avg_bandwidth_utilization_pct,
            "avg_queue_occupancy_pct": exp.avg_queue_occupancy_pct,
            "congestion_duration_seconds": exp.congestion_duration_seconds,
            "congestion_events_count": exp.congestion_events_count,
            "created_at": exp.created_at.isoformat() if exp.created_at else None
        }
        for exp in experiments
    ]


@router.get("/experiments/{experiment_id}")
def get_experiment_details(experiment_id: str, db: Session = Depends(get_db)):
    exp = db.query(ExperimentModel).filter(ExperimentModel.id == experiment_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")
    
    snaps = db.query(MetricSnapshotModel).filter(
        MetricSnapshotModel.experiment_id == experiment_id
    ).order_by(MetricSnapshotModel.step_index.asc()).all()

    events = db.query(CongestionEventModel).filter(
        CongestionEventModel.experiment_id == experiment_id
    ).all()

    return {
        "experiment": {
            "id": exp.id,
            "name": exp.name,
            "qos_mode": exp.qos_mode,
            "random_seed": exp.random_seed,
            "duration_seconds": exp.duration_seconds,
            "overall_throughput_mbps": exp.overall_throughput_mbps,
            "overall_avg_latency_ms": exp.overall_avg_latency_ms,
            "overall_p95_latency_ms": exp.overall_p95_latency_ms,
            "overall_jitter_ms": exp.overall_jitter_ms,
            "overall_packet_loss_pct": exp.overall_packet_loss_pct,
            "created_at": exp.created_at.isoformat() if exp.created_at else None
        },
        "metrics_count": len(snaps),
        "snapshots": [
            {
                "step_index": s.step_index,
                "simulated_time_sec": s.simulated_time_sec,
                "qos_mode": s.qos_mode,
                "offered_load_mbps": s.offered_load_mbps,
                "delivered_throughput_mbps": s.delivered_throughput_mbps,
                "link_utilization_pct": s.link_utilization_pct,
                "queue_occupancy_pct": s.queue_occupancy_pct,
                "avg_latency_ms": s.avg_latency_ms,
                "p95_latency_ms": s.p95_latency_ms,
                "jitter_ms": s.jitter_ms,
                "packet_loss_pct": s.packet_loss_pct
            }
            for s in snaps
        ],
        "events": [
            {
                "simulated_time_sec": e.simulated_time_sec,
                "previous_state": e.previous_state,
                "new_state": e.new_state,
                "reason": e.reason
            }
            for e in events
        ]
    }


@router.get("/experiments/{experiment_id}/export")
def export_experiment_csv(experiment_id: str):
    csv_content = simulation_service.export_csv(experiment_id)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=experiment_{experiment_id}.csv"}
    )
