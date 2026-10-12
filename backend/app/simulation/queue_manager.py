"""Queue management component for the Wi-Fi AP bottleneck link.

Maintains finite buffer queues, enforces queue limits, handles tail drop or
priority drop, and tracks buffer occupancy.
"""

from collections import deque
from typing import List, Tuple, Optional
from app.simulation.models import Packet, TrafficCategory, QoSMode


class QueueManager:
    def __init__(self, capacity_bytes: int = 500_000, qos_mode: QoSMode = QoSMode.BASELINE):
        self.capacity_bytes = capacity_bytes
        self.qos_mode = qos_mode
        self.current_bytes = 0
        
        # Single FIFO queue for Baseline
        self.fifo_queue: deque[Packet] = deque()
        
        # Class-based queues for Static & Adaptive QoS
        self.real_time_queue: deque[Packet] = deque()
        self.best_effort_queue: deque[Packet] = deque()
        self.bulk_queue: deque[Packet] = deque()
        
        # Accounting for current bytes per class
        self.bytes_by_category = {
            TrafficCategory.REAL_TIME: 0,
            TrafficCategory.BEST_EFFORT: 0,
            TrafficCategory.BULK: 0
        }

    def reset(self, capacity_bytes: int, qos_mode: QoSMode) -> None:
        self.capacity_bytes = capacity_bytes
        self.qos_mode = qos_mode
        self.current_bytes = 0
        self.fifo_queue.clear()
        self.real_time_queue.clear()
        self.best_effort_queue.clear()
        self.bulk_queue.clear()
        for cat in self.bytes_by_category:
            self.bytes_by_category[cat] = 0

    @property
    def total_packets(self) -> int:
        if self.qos_mode == QoSMode.BASELINE:
            return len(self.fifo_queue)
        return len(self.real_time_queue) + len(self.best_effort_queue) + len(self.bulk_queue)

    @property
    def occupancy_pct(self) -> float:
        if self.capacity_bytes <= 0:
            return 0.0
        return min(100.0, (self.current_bytes / self.capacity_bytes) * 100.0)

    def enqueue(self, packet: Packet, dynamic_bulk_limit_bytes: Optional[int] = None) -> Tuple[bool, Optional[str]]:
        """
        Attempt to enqueue a packet.
        Returns: (is_admitted: bool, drop_reason: Optional[str])
        """
        # Dynamic bulk buffer clamping for Adaptive QoS under congestion
        if dynamic_bulk_limit_bytes is not None and packet.category == TrafficCategory.BULK:
            if self.bytes_by_category[TrafficCategory.BULK] + packet.size_bytes > dynamic_bulk_limit_bytes:
                packet.is_dropped = True
                packet.drop_reason = "Adaptive AQM: Bulk buffer limit reached"
                return False, packet.drop_reason

        # Global buffer capacity check
        if self.current_bytes + packet.size_bytes > self.capacity_bytes:
            # Under Static or Adaptive QoS, if real-time packet arrives and buffer is full,
            # we can push out (drop) the lowest-priority bulk packet if one exists
            if self.qos_mode in (QoSMode.STATIC_QoS, QoSMode.ADAPTIVE_QoS) and packet.category == TrafficCategory.REAL_TIME:
                if len(self.bulk_queue) > 0:
                    dropped_bulk = self.bulk_queue.pop()
                    dropped_bulk.is_dropped = True
                    dropped_bulk.drop_reason = "Preempted by Real-Time Priority Packet"
                    self.current_bytes -= dropped_bulk.size_bytes
                    self.bytes_by_category[TrafficCategory.BULK] -= dropped_bulk.size_bytes
                elif len(self.best_effort_queue) > 0:
                    dropped_be = self.best_effort_queue.pop()
                    dropped_be.is_dropped = True
                    dropped_be.drop_reason = "Preempted by Real-Time Priority Packet"
                    self.current_bytes -= dropped_be.size_bytes
                    self.bytes_by_category[TrafficCategory.BEST_EFFORT] -= dropped_be.size_bytes

            # Check if still full after potential preemption
            if self.current_bytes + packet.size_bytes > self.capacity_bytes:
                packet.is_dropped = True
                packet.drop_reason = "Queue Full (Tail Drop)"
                return False, packet.drop_reason

        # Admit packet
        self.current_bytes += packet.size_bytes
        self.bytes_by_category[packet.category] += packet.size_bytes

        if self.qos_mode == QoSMode.BASELINE:
            self.fifo_queue.append(packet)
        else:
            if packet.category == TrafficCategory.REAL_TIME:
                self.real_time_queue.append(packet)
            elif packet.category == TrafficCategory.BEST_EFFORT:
                self.best_effort_queue.append(packet)
            else:
                self.bulk_queue.append(packet)

        return True, None
