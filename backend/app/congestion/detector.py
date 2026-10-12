"""Rule-based Congestion Detector with sliding window smoothing and hysteresis."""

from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from collections import deque
from app.simulation.models import CongestionState, SimulationConfig


@dataclass
class CongestionEvent:
    event_id: str
    simulated_time_sec: float
    previous_state: CongestionState
    new_state: CongestionState
    trigger_metrics: Dict[str, float]
    reason: str


class CongestionDetector:
    def __init__(self, config: SimulationConfig, window_size: int = 5):
        self.config = config
        self.window_size = window_size
        self.current_state = CongestionState.NORMAL
        
        # Sliding history windows for smoothing metrics
        self.util_window: deque[float] = deque(maxlen=window_size)
        self.latency_window: deque[float] = deque(maxlen=window_size)
        self.queue_window: deque[float] = deque(maxlen=window_size)
        self.loss_window: deque[float] = deque(maxlen=window_size)
        
        # State tracking
        self.consecutive_normal_steps = 0
        self.consecutive_congested_steps = 0
        self.cooldown_remaining_steps = 0
        self.events: List[CongestionEvent] = []
        self.event_counter = 0

    def reset(self, config: SimulationConfig) -> None:
        self.config = config
        self.current_state = CongestionState.NORMAL
        self.util_window.clear()
        self.latency_window.clear()
        self.queue_window.clear()
        self.loss_window.clear()
        self.consecutive_normal_steps = 0
        self.consecutive_congested_steps = 0
        self.cooldown_remaining_steps = 0
        self.events.clear()
        self.event_counter = 0

    @property
    def current_moving_averages(self) -> Dict[str, float]:
        """Returns the smoothed rolling-average telemetry across the sliding window."""
        return {
            "avg_utilization_pct": round(sum(self.util_window) / len(self.util_window), 2) if self.util_window else 0.0,
            "avg_latency_ms": round(sum(self.latency_window) / len(self.latency_window), 2) if self.latency_window else 0.0,
            "avg_queue_occupancy_pct": round(sum(self.queue_window) / len(self.queue_window), 2) if self.queue_window else 0.0,
            "avg_packet_loss_pct": round(sum(self.loss_window) / len(self.loss_window), 2) if self.loss_window else 0.0,
        }

    @property
    def recovery_progress(self) -> Dict[str, Any]:
        """Provides status on recovery countdown and cooldown timers."""
        return {
            "consecutive_clean_steps": self.consecutive_normal_steps,
            "required_clean_steps": self.config.adaptive_recovery_steps,
            "recovery_pct": min(100.0, round((self.consecutive_normal_steps / max(1, self.config.adaptive_recovery_steps)) * 100.0, 1)),
            "cooldown_remaining_steps": self.cooldown_remaining_steps,
            "cooldown_active": self.cooldown_remaining_steps > 0
        }

    def update(
        self,
        current_time_sec: float,
        step_utilization_pct: float,
        step_avg_latency_ms: float,
        step_queue_occupancy_pct: float,
        step_packet_loss_pct: float
    ) -> CongestionState:
        """
        Feed step metrics into detector and return updated CongestionState.
        """
        # Append to moving average windows
        self.util_window.append(step_utilization_pct)
        self.latency_window.append(step_avg_latency_ms)
        self.queue_window.append(step_queue_occupancy_pct)
        self.loss_window.append(step_packet_loss_pct)

        avg_util = sum(self.util_window) / len(self.util_window)
        avg_lat = sum(self.latency_window) / len(self.latency_window)
        avg_queue = sum(self.queue_window) / len(self.queue_window)
        avg_loss = sum(self.loss_window) / len(self.loss_window)

        if self.cooldown_remaining_steps > 0:
            self.cooldown_remaining_steps -= 1

        # Check conditions
        is_congested_condition = (
            avg_util >= self.config.threshold_utilization_congested or
            avg_queue >= self.config.threshold_queue_occupancy_congested or
            avg_loss >= self.config.threshold_packet_loss_congested or
            avg_lat >= self.config.threshold_latency_congested_ms
        )

        is_warning_condition = (
            avg_util >= self.config.threshold_utilization_warning or
            avg_queue >= self.config.threshold_queue_occupancy_warning or
            avg_lat >= self.config.threshold_latency_warning_ms
        )

        previous_state = self.current_state
        transition_reason = ""

        # State transition logic with hysteresis and persistence
        if self.current_state == CongestionState.NORMAL:
            if is_congested_condition:
                self.consecutive_congested_steps += 1
                if self.consecutive_congested_steps >= 2:  # 2 steps persistence
                    self.current_state = CongestionState.CONGESTED
                    transition_reason = f"Severe congestion: Util={avg_util:.1f}%, Queue={avg_queue:.1f}%, Loss={avg_loss:.1f}%, Lat={avg_lat:.1f}ms"
            elif is_warning_condition:
                self.current_state = CongestionState.WARNING
                transition_reason = f"Warning threshold exceeded: Util={avg_util:.1f}%, Queue={avg_queue:.1f}%"
            else:
                self.consecutive_congested_steps = 0

        elif self.current_state == CongestionState.WARNING:
            if is_congested_condition:
                self.consecutive_congested_steps += 1
                if self.consecutive_congested_steps >= 2:
                    self.current_state = CongestionState.CONGESTED
                    transition_reason = f"Escalated to Congested: Util={avg_util:.1f}%, Queue={avg_queue:.1f}%, Loss={avg_loss:.1f}%"
            elif not is_warning_condition:
                self.current_state = CongestionState.NORMAL
                transition_reason = "Metrics returned below warning thresholds"
                self.consecutive_congested_steps = 0

        elif self.current_state == CongestionState.CONGESTED:
            if not is_congested_condition:
                self.current_state = CongestionState.RECOVERING
                self.consecutive_normal_steps = 1
                transition_reason = "Congestion cleared; entering recovery verification phase"
            else:
                self.consecutive_normal_steps = 0

        elif self.current_state == CongestionState.RECOVERING:
            if is_congested_condition:
                # Relapse into congestion
                self.current_state = CongestionState.CONGESTED
                self.consecutive_normal_steps = 0
                transition_reason = "Relapse: Congestion detected during recovery phase"
            else:
                self.consecutive_normal_steps += 1
                if self.consecutive_normal_steps >= self.config.adaptive_recovery_steps:
                    self.current_state = CongestionState.NORMAL
                    self.cooldown_remaining_steps = self.config.adaptive_cooldown_steps
                    transition_reason = f"Full recovery sustained over {self.config.adaptive_recovery_steps} steps. Cooldown activated."

        # If state changed, log event
        if self.current_state != previous_state:
            self.event_counter += 1
            event = CongestionEvent(
                event_id=f"ce_{self.event_counter}",
                simulated_time_sec=round(current_time_sec, 2),
                previous_state=previous_state,
                new_state=self.current_state,
                trigger_metrics={
                    "avg_utilization_pct": round(avg_util, 2),
                    "avg_queue_occupancy_pct": round(avg_queue, 2),
                    "avg_latency_ms": round(avg_lat, 2),
                    "avg_packet_loss_pct": round(avg_loss, 2)
                },
                reason=transition_reason
            )
            self.events.append(event)

        return self.current_state
