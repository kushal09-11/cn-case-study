"""Root-Cause Hypothesis & Explainable Diagnosis Engine."""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from app.simulation.models import StepMetrics, QoSMode, TrafficCategory


class DiagnosisReport(BaseModel):
    id: str
    likely_cause: str
    confidence: str  # "HIGH", "MEDIUM", "LOW", or "INCONCLUSIVE"
    supporting_measurements: Dict[str, Any]
    suggested_action: str


class CongestionDiagnostics:
    @staticmethod
    def analyze(metrics: StepMetrics, bottleneck_capacity_mbps: float) -> List[DiagnosisReport]:
        diagnoses: List[DiagnosisReport] = []

        offered = metrics.offered_load_mbps
        delivered = metrics.delivered_throughput_mbps
        util = metrics.link_utilization_pct
        queue_occ = metrics.queue_occupancy_pct
        loss_pct = metrics.packet_loss_pct
        lat = metrics.avg_latency_ms
        qos_mode = metrics.qos_mode

        # Check per-category throughput/latency if present
        bulk_tp = metrics.category_throughput_mbps.get(TrafficCategory.BULK.value, 0.0)
        rt_tp = metrics.category_throughput_mbps.get(TrafficCategory.REAL_TIME.value, 0.0)
        rt_loss = metrics.category_loss_pct.get(TrafficCategory.REAL_TIME.value, 0.0)
        rt_lat = metrics.category_latency_ms.get(TrafficCategory.REAL_TIME.value, 0.0)

        # 1. Offered load exceeds available link capacity
        if offered > bottleneck_capacity_mbps:
            excess_pct = round(((offered - bottleneck_capacity_mbps) / bottleneck_capacity_mbps) * 100.0, 1)
            diagnoses.append(DiagnosisReport(
                id="diag_overload",
                likely_cause="Offered traffic load exceeds total wireless bottleneck link capacity.",
                confidence="HIGH",
                supporting_measurements={
                    "offered_load_mbps": offered,
                    "bottleneck_capacity_mbps": bottleneck_capacity_mbps,
                    "excess_percentage": f"{excess_pct}%",
                    "utilization_pct": util
                },
                suggested_action="Enable Adaptive QoS traffic shaping or increase available AP bottleneck bandwidth."
            ))

        # 2. Queue buildup is increasing latency (Bufferbloat)
        if queue_occ > 40.0 and lat > 30.0:
            diagnoses.append(DiagnosisReport(
                id="diag_queue_delay",
                likely_cause="Queue buffer buildup is introducing significant queueing delay (Bufferbloat).",
                confidence="HIGH" if queue_occ > 70.0 else "MEDIUM",
                supporting_measurements={
                    "queue_occupancy_pct": queue_occ,
                    "avg_latency_ms": lat,
                    "p95_latency_ms": metrics.p95_latency_ms
                },
                suggested_action="Apply Active Queue Management (AQM) and prioritize interactive packets to minimize buffer dwell time."
            ))

        # 3. Queue saturation causing packet drops
        if loss_pct > 0.0 or metrics.total_packets_dropped > 0:
            diagnoses.append(DiagnosisReport(
                id="diag_packet_drops",
                likely_cause="Queue capacity exceeded; incoming packets are suffering tail drops.",
                confidence="HIGH",
                supporting_measurements={
                    "packet_loss_pct": loss_pct,
                    "total_dropped_packets": metrics.total_packets_dropped,
                    "queue_occupancy_pct": queue_occ
                },
                suggested_action="Differentiate drops by class: protect latency-sensitive packets while selectively throttling bulk packets."
            ))

        # 4. Bulk traffic competing with / starving latency-sensitive traffic
        if bulk_tp > rt_tp * 2.0 and rt_lat > 25.0:
            diagnoses.append(DiagnosisReport(
                id="diag_bulk_starvation",
                likely_cause="Bulk file transfers are monopolizing link capacity and degrading real-time flows.",
                confidence="HIGH" if qos_mode == QoSMode.BASELINE else "MEDIUM",
                supporting_measurements={
                    "bulk_throughput_mbps": bulk_tp,
                    "real_time_throughput_mbps": rt_tp,
                    "real_time_latency_ms": rt_lat,
                    "active_qos_mode": qos_mode.value
                },
                suggested_action="Activate Static or Adaptive QoS priority queueing to isolate real-time video/voice from bulk downloads."
            ))

        # 5. QoS policy insufficient
        if qos_mode == QoSMode.BASELINE and (loss_pct > 1.0 or lat > 40.0):
            diagnoses.append(DiagnosisReport(
                id="diag_qos_insufficient",
                likely_cause="Baseline FIFO scheduling is treating all packets identically, leaving latency-sensitive traffic unprotected.",
                confidence="HIGH",
                supporting_measurements={
                    "current_qos_mode": "baseline_fifo",
                    "real_time_packet_loss_pct": rt_loss,
                    "real_time_latency_ms": rt_lat
                },
                suggested_action="Switch to Static QoS or Adaptive QoS to guarantee prioritization for real-time traffic."
            ))

        if not diagnoses:
            diagnoses.append(DiagnosisReport(
                id="diag_normal",
                likely_cause="Network operating normally within configured capacity limits.",
                confidence="HIGH",
                supporting_measurements={
                    "utilization_pct": util,
                    "queue_occupancy_pct": queue_occ,
                    "avg_latency_ms": lat
                },
                suggested_action="Continue monitoring network telemetry."
            ))

        return diagnoses
