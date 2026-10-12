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
    policy_parameters: Dict[str, Any]


class QoSController:
    def __init__(self, config: SimulationConfig):
        self.config = config
        self.mode = config.qos_mode
        self.active_policy_name = self._initial_policy_name()
        self.transitions: List[QoSTransition] = []
        self.transition_counter = 0
        self.is_throttling_bulk = False

    def _initial_policy_name(self) -> str:
        if self.mode == QoSMode.BASELINE:
            return "FIFO Neutral (No QoS)"
        elif self.mode == QoSMode.STATIC_QoS:
            return "Static Strict Priority (RT > BE > Bulk)"
        elif self.mode == QoSMode.ADAPTIVE_QoS:
            return "Adaptive Normal (Dynamic Fair Share)"
        return "Unknown"

    def reset(self, config: SimulationConfig) -> None:
        self.config = config
        self.mode = config.qos_mode
        self.active_policy_name = self._initial_policy_name()
        self.transitions.clear()
        self.transition_counter = 0
        self.is_throttling_bulk = False

    def evaluate_and_update(
        self,
        current_time_sec: float,
        congestion_state: CongestionState,
        detector_cooldown_remaining: int
    ) -> Dict[str, Any]:
        """
        Evaluate network state and return active scheduling parameters.
        """
        previous_policy = self.active_policy_name
        policy_params: Dict[str, Any] = {
            "mode": self.mode.value,
            "is_congested": False,
            "bulk_rate_limit_ratio": 1.0,
            "dynamic_bulk_buffer_limit_bytes": None
        }

        if self.mode == QoSMode.BASELINE:
            self.active_policy_name = "FIFO Neutral (No QoS)"
            return policy_params

        if self.mode == QoSMode.STATIC_QoS:
            self.active_policy_name = "Static Strict Priority (RT > BE > Bulk)"
            policy_params["is_congested"] = False
            return policy_params

        # Adaptive QoS State Machine
        if self.mode == QoSMode.ADAPTIVE_QoS:
            if congestion_state in (CongestionState.CONGESTED, CongestionState.WARNING):
                self.is_throttling_bulk = True
                self.active_policy_name = "Adaptive Congestion Policy (Bulk Throttled + Real-Time Protected)"
                policy_params["is_congested"] = True
                policy_params["bulk_rate_limit_ratio"] = self.config.adaptive_bulk_rate_limit_ratio
                # Dynamic bulk buffer clamp to prevent bufferbloat
                policy_params["dynamic_bulk_buffer_limit_bytes"] = int(self.config.queue_capacity_bytes * 0.35)

            elif congestion_state == CongestionState.RECOVERING:
                # Maintain protective policy during recovery phase
                self.active_policy_name = "Adaptive Recovery Policy (Maintaining Bulk Cap)"
                policy_params["is_congested"] = True
                policy_params["bulk_rate_limit_ratio"] = min(0.50, self.config.adaptive_bulk_rate_limit_ratio * 1.5)
                policy_params["dynamic_bulk_buffer_limit_bytes"] = int(self.config.queue_capacity_bytes * 0.50)

            elif congestion_state == CongestionState.NORMAL:
                self.is_throttling_bulk = False
                self.active_policy_name = "Adaptive Normal (Dynamic Fair Share)"
                policy_params["is_congested"] = False
                policy_params["bulk_rate_limit_ratio"] = 1.0
                policy_params["dynamic_bulk_buffer_limit_bytes"] = None

            # Record policy change if policy name modified
            if self.active_policy_name != previous_policy:
                self.transition_counter += 1
                transition = QoSTransition(
                    transition_id=f"qos_tr_{self.transition_counter}",
                    simulated_time_sec=round(current_time_sec, 2),
                    previous_policy=previous_policy,
                    new_policy=self.active_policy_name,
                    trigger_state=congestion_state,
                    reason=f"Adaptive controller responded to congestion state: {congestion_state.value}",
                    policy_parameters=policy_params
                )
                self.transitions.append(transition)

        return policy_params
