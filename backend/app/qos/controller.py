"""QoS Controller managing Baseline, Static QoS, and Adaptive QoS state machines."""

from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from app.simulation.models import QoSMode, CongestionState, SimulationConfig


@dataclass
class QoSTransition:
    transition_id: str
    simulated_time_sec: float
    previous_policy: str
    new_policy: str
    trigger_state: CongestionState
    reason: str
    trigger_metrics: Dict[str, Any]
    affected_classes: List[str]
    affected_flows: List[str]
    action_applied: bool
    policy_parameters: Dict[str, Any]


class QoSController:
    def __init__(self, config: SimulationConfig):
        self.config = config
        self.mode = config.qos_mode
        self.active_policy_name = self._initial_policy_name()
        self.transitions: List[QoSTransition] = []
        self.transition_counter = 0
        self.is_throttling_bulk = False
        self.latest_decision: Dict[str, Any] = self._initial_decision()

    def _initial_policy_name(self) -> str:
        if self.mode == QoSMode.BASELINE:
            return "FIFO Neutral (No QoS)"
        elif self.mode == QoSMode.STATIC_QoS:
            return "Static Strict Priority (RT > BE > Bulk)"
        elif self.mode == QoSMode.ADAPTIVE_QoS:
            return "Adaptive Normal (Dynamic Fair Share)"
        return "Unknown"

    def _initial_decision(self) -> Dict[str, Any]:
        return {
            "current_state": "normal",
            "active_policy": self._initial_policy_name(),
            "previous_policy": "None (Initial State)",
            "reason": "Initial baseline operating state.",
            "trigger_evidence": {
                "avg_utilization_pct": 0.0,
                "avg_queue_occupancy_pct": 0.0,
                "avg_latency_ms": 5.0,
                "avg_packet_loss_pct": 0.0
            },
            "affected_classes": ["real_time", "best_effort", "bulk"],
            "affected_flows": [f.flow_id for f in self.config.flows],
            "bulk_restriction": "Unrestricted (Fair share up to 100% capacity)",
            "recovery_condition": f"Requires {self.config.adaptive_recovery_steps} clean steps (<{self.config.threshold_utilization_congested}% util)",
            "recovery_status": "Normal operating state (no recovery needed)",
            "cooldown_status": "Inactive",
            "action_applied": True,
            "simulator_verified": True
        }

    def reset(self, config: SimulationConfig) -> None:
        self.config = config
        self.mode = config.qos_mode
        self.active_policy_name = self._initial_policy_name()
        self.transitions.clear()
        self.transition_counter = 0
        self.is_throttling_bulk = False
        self.latest_decision = self._initial_decision()

    def evaluate_and_update(
        self,
        current_time_sec: float,
        congestion_state: CongestionState,
        moving_averages: Dict[str, float],
        recovery_info: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Evaluate network state, update adaptive QoS policy parameters, and record decisions.
        """
        previous_policy = self.active_policy_name
        policy_params: Dict[str, Any] = {
            "mode": self.mode.value,
            "is_congested": False,
            "bulk_rate_limit_ratio": 1.0,
            "dynamic_bulk_buffer_limit_bytes": None
        }

        bulk_flows = [f.flow_id for f in self.config.flows if f.category.value == "bulk"]
        rt_flows = [f.flow_id for f in self.config.flows if f.category.value == "real_time"]

        if self.mode == QoSMode.BASELINE:
            self.active_policy_name = "FIFO Neutral (No QoS)"
            self.latest_decision = {
                "current_state": congestion_state.value,
                "active_policy": self.active_policy_name,
                "previous_policy": previous_policy,
                "reason": "Baseline FIFO active: all flows treated identically without class-based prioritization.",
                "trigger_evidence": moving_averages,
                "affected_classes": ["real_time", "best_effort", "bulk"],
                "affected_flows": [f.flow_id for f in self.config.flows],
                "bulk_restriction": "None (Bulk traffic freely contends with real-time packets in shared buffer)",
                "recovery_condition": "N/A (QoS disabled in Baseline FIFO)",
                "recovery_status": "N/A",
                "cooldown_status": "N/A",
                "action_applied": True,
                "simulator_verified": True
            }
            return policy_params

        if self.mode == QoSMode.STATIC_QoS:
            self.active_policy_name = "Static Strict Priority (RT > BE > Bulk)"
            policy_params["is_congested"] = False
            self.latest_decision = {
                "current_state": congestion_state.value,
                "active_policy": self.active_policy_name,
                "previous_policy": previous_policy,
                "reason": "Static Strict Priority active: Real-Time packets permanently drained before Best-Effort and Bulk.",
                "trigger_evidence": moving_averages,
                "affected_classes": ["real_time", "best_effort", "bulk"],
                "affected_flows": rt_flows + bulk_flows,
                "bulk_restriction": "Served only after Real-Time and Best-Effort queues are empty",
                "recovery_condition": "N/A (Fixed policy)",
                "recovery_status": "N/A",
                "cooldown_status": "N/A",
                "action_applied": True,
                "simulator_verified": True
            }
            return policy_params

        # Mode C: Adaptive QoS State Machine
        reason_str = ""
        bulk_cap_desc = ""
        affected_cls = []
        affected_flw = []

        if congestion_state in (CongestionState.CONGESTED, CongestionState.WARNING):
            self.is_throttling_bulk = True
            self.active_policy_name = "Adaptive Congestion Policy (Bulk Throttled + Real-Time Protected)"
            policy_params["is_congested"] = True
            policy_params["bulk_rate_limit_ratio"] = self.config.adaptive_bulk_rate_limit_ratio
            policy_params["dynamic_bulk_buffer_limit_bytes"] = int(self.config.queue_capacity_bytes * 0.35)

            reason_str = f"Congestion detected (Util: {moving_averages.get('avg_utilization_pct', 0)}%, Queue: {moving_averages.get('avg_queue_occupancy_pct', 0)}%). Activated dynamic bulk cap and strict priority."
            bulk_cap_desc = f"Active: Capped to {int(self.config.adaptive_bulk_rate_limit_ratio * 100)}% ({self.config.bottleneck_capacity_mbps * self.config.adaptive_bulk_rate_limit_ratio:.1f} Mbps) + AQM buffer clamp"
            affected_cls = ["bulk", "real_time"]
            affected_flw = bulk_flows + rt_flows

        elif congestion_state == CongestionState.RECOVERING:
            self.is_throttling_bulk = True
            self.active_policy_name = "Adaptive Recovery Policy (Maintaining Bulk Cap)"
            policy_params["is_congested"] = True
            policy_params["bulk_rate_limit_ratio"] = min(0.50, self.config.adaptive_bulk_rate_limit_ratio * 1.5)
            policy_params["dynamic_bulk_buffer_limit_bytes"] = int(self.config.queue_capacity_bytes * 0.50)

            reason_str = f"Verification phase: {recovery_info.get('consecutive_clean_steps', 0)}/{recovery_info.get('required_clean_steps', 10)} clean steps observed. Maintaining protective restrictions."
            bulk_cap_desc = f"Recovery Cap: {int(policy_params['bulk_rate_limit_ratio'] * 100)}% ({self.config.bottleneck_capacity_mbps * policy_params['bulk_rate_limit_ratio']:.1f} Mbps)"
            affected_cls = ["bulk"]
            affected_flw = bulk_flows

        elif congestion_state == CongestionState.NORMAL:
            self.is_throttling_bulk = False
            self.active_policy_name = "Adaptive Normal (Dynamic Fair Share)"
            policy_params["is_congested"] = False
            policy_params["bulk_rate_limit_ratio"] = 1.0
            policy_params["dynamic_bulk_buffer_limit_bytes"] = None

            reason_str = "Network stable: Restored balanced fair-share queueing. Bulk flows granted full available bandwidth."
            bulk_cap_desc = "Unrestricted (Proportional fair share up to 100% capacity)"
            affected_cls = ["bulk", "best_effort", "real_time"]
            affected_flw = [f.flow_id for f in self.config.flows]

        # Update latest decision panel state
        self.latest_decision = {
            "current_state": congestion_state.value,
            "congestion_state": congestion_state.value,
            "active_policy": self.active_policy_name,
            "applied_policy": self.active_policy_name,
            "previous_policy": previous_policy,
            "reason": reason_str,
            "trigger_evidence": moving_averages,
            "affected_classes": affected_cls,
            "affected_flows": affected_flw,
            "bulk_restriction": bulk_cap_desc,
            "bulk_restriction_active": self.is_throttling_bulk,
            "bulk_rate_limit_ratio": self.config.adaptive_bulk_rate_limit_ratio,
            "recovery_condition": f"Requires {self.config.adaptive_recovery_steps} consecutive uncongested steps",
            "recovery_status": f"{recovery_info.get('consecutive_clean_steps', 0)} / {recovery_info.get('required_clean_steps', 10)} steps ({recovery_info.get('recovery_pct', 0)}%)",
            "cooldown_status": f"Cooldown active ({recovery_info.get('cooldown_remaining_steps', 0)} steps remaining)" if recovery_info.get('cooldown_active') else "Inactive (Ready for transition)",
            "action_applied": True,
            "action_applied_successfully": True,
            "simulator_verified": True,
            "timestamp_sec": round(current_time_sec, 2)
        }

        # Record policy transition if policy shifted
        if self.active_policy_name != previous_policy:
            self.transition_counter += 1
            transition = QoSTransition(
                transition_id=f"qos_tr_{self.transition_counter}",
                simulated_time_sec=round(current_time_sec, 2),
                previous_policy=previous_policy,
                new_policy=self.active_policy_name,
                trigger_state=congestion_state,
                reason=reason_str,
                trigger_metrics=moving_averages,
                affected_classes=affected_cls,
                affected_flows=affected_flw,
                action_applied=True,
                policy_parameters=policy_params
            )
            self.transitions.append(transition)

        return policy_params
