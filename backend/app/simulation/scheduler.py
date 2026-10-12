"""Scheduler implementations for Baseline FIFO, Static QoS, and Adaptive QoS."""

from typing import List, Dict, Any, Tuple
from app.simulation.models import Packet, QoSMode, TrafficCategory
from app.simulation.queue_manager import QueueManager


class BaseScheduler:
    def __init__(self, bottleneck_capacity_mbps: float):
        self.capacity_mbps = bottleneck_capacity_mbps
        self.base_wifi_propagation_delay_sec = 0.005  # 5ms simulated Wi-Fi medium access & propagation

    def set_capacity(self, capacity_mbps: float) -> None:
        self.capacity_mbps = capacity_mbps

    def _mark_packet_delivery(self, pkt: Packet, current_time_sec: float) -> None:
        """
        Calculates physical transmission and propagation delay.
        In absolute simulated time, packet delivery completes at:
        delivery_time = current_time_sec + tx_delay + base_propagation_delay.
        The end-to-end latency is (delivery_time - pkt.creation_time).
        """
        tx_delay_sec = (pkt.size_bytes * 8.0) / max(1.0, self.capacity_mbps * 1_000_000.0)
        pkt.delivery_time = current_time_sec + tx_delay_sec + self.base_wifi_propagation_delay_sec
        pkt.service_start_time = current_time_sec

    def schedule(
        self,
        queue_mgr: QueueManager,
        current_time_sec: float,
        time_step_sec: float,
        policy_params: Dict[str, Any]
    ) -> List[Packet]:
        raise NotImplementedError


class FIFOScheduler(BaseScheduler):
    """
    Baseline FIFO scheduler:
    Serves all packets in neutral first-come, first-served order from a single shared queue.
    """
    def schedule(
        self,
        queue_mgr: QueueManager,
        current_time_sec: float,
        time_step_sec: float,
        policy_params: Dict[str, Any]
    ) -> List[Packet]:
        delivered_packets: List[Packet] = []
        max_bytes_this_step = (self.capacity_mbps * 1_000_000.0 * time_step_sec) / 8.0
        bytes_served = 0.0

        while queue_mgr.fifo_queue:
            head_pkt = queue_mgr.fifo_queue[0]
            if bytes_served + head_pkt.size_bytes > max_bytes_this_step:
                # Link capacity exhausted for this slice
                break

            pkt = queue_mgr.fifo_queue.popleft()
            queue_mgr.current_bytes -= pkt.size_bytes
            queue_mgr.bytes_by_category[pkt.category] -= pkt.size_bytes

            self._mark_packet_delivery(pkt, current_time_sec)
            delivered_packets.append(pkt)
            bytes_served += pkt.size_bytes

        return delivered_packets


class StaticQoSScheduler(BaseScheduler):
    """
    Static QoS scheduler:
    Fixed strict priority queueing: Real-Time > Best-Effort > Bulk.
    Always evacuates higher-priority queues before lower-priority queues.
    """
    def schedule(
        self,
        queue_mgr: QueueManager,
        current_time_sec: float,
        time_step_sec: float,
        policy_params: Dict[str, Any]
    ) -> List[Packet]:
        delivered_packets: List[Packet] = []
        max_bytes_this_step = (self.capacity_mbps * 1_000_000.0 * time_step_sec) / 8.0
        bytes_served = 0.0

        # Drain queues in strict priority order
        queue_priority_order = [
            (queue_mgr.real_time_queue, TrafficCategory.REAL_TIME),
            (queue_mgr.best_effort_queue, TrafficCategory.BEST_EFFORT),
            (queue_mgr.bulk_queue, TrafficCategory.BULK)
        ]

        for q, cat in queue_priority_order:
            while q:
                head_pkt = q[0]
                if bytes_served + head_pkt.size_bytes > max_bytes_this_step:
                    break

                pkt = q.popleft()
                queue_mgr.current_bytes -= pkt.size_bytes
                queue_mgr.bytes_by_category[cat] -= pkt.size_bytes

                self._mark_packet_delivery(pkt, current_time_sec)
                delivered_packets.append(pkt)
                bytes_served += pkt.size_bytes

            if bytes_served >= max_bytes_this_step:
                break

        return delivered_packets


class AdaptiveQoSScheduler(BaseScheduler):
    """
    Adaptive QoS scheduler:
    - NORMAL State: Weighted Fair Queueing (WFQ) / proportional sharing across classes
      (Real-Time: 40%, Best-Effort: 35%, Bulk: 25%), allowing bulk transfers smooth throughput.
    - CONGESTED State: Switches dynamically to Strict Real-Time Priority with
      strict rate limiting on Bulk traffic (clamped to bulk_rate_limit_ratio, e.g. 20%).
    """
    def schedule(
        self,
        queue_mgr: QueueManager,
        current_time_sec: float,
        time_step_sec: float,
        policy_params: Dict[str, Any]
    ) -> List[Packet]:
        delivered_packets: List[Packet] = []
        max_bytes_this_step = (self.capacity_mbps * 1_000_000.0 * time_step_sec) / 8.0
        bytes_served = 0.0

        is_congested = policy_params.get("is_congested", False)
        bulk_rate_limit_ratio = policy_params.get("bulk_rate_limit_ratio", 0.20)

        if not is_congested:
            # NORMAL STATE: Proportional Weighted Fair Queueing (WFQ)
            # Weights: Real-Time 40%, Best-Effort 35%, Bulk 25%
            weights = {
                TrafficCategory.REAL_TIME: 0.40,
                TrafficCategory.BEST_EFFORT: 0.35,
                TrafficCategory.BULK: 0.25
            }
            queues = [
                (queue_mgr.real_time_queue, TrafficCategory.REAL_TIME),
                (queue_mgr.best_effort_queue, TrafficCategory.BEST_EFFORT),
                (queue_mgr.bulk_queue, TrafficCategory.BULK)
            ]

            # Round 1: Service each queue up to its assigned fair quota
            for q, cat in queues:
                quota = max_bytes_this_step * weights[cat]
                q_bytes_served = 0.0
                while q and (bytes_served < max_bytes_this_step):
                    head_pkt = q[0]
                    if (q_bytes_served + head_pkt.size_bytes > quota and q_bytes_served > 0) or \
                       (bytes_served + head_pkt.size_bytes > max_bytes_this_step):
                        break

                    pkt = q.popleft()
                    queue_mgr.current_bytes -= pkt.size_bytes
                    queue_mgr.bytes_by_category[cat] -= pkt.size_bytes

                    self._mark_packet_delivery(pkt, current_time_sec)
                    delivered_packets.append(pkt)
                    bytes_served += pkt.size_bytes
                    q_bytes_served += pkt.size_bytes

            # Round 2: Spillover remaining capacity (Real-Time -> Best-Effort -> Bulk)
            for q, cat in queues:
                while q and (bytes_served < max_bytes_this_step):
                    head_pkt = q[0]
                    if bytes_served + head_pkt.size_bytes > max_bytes_this_step:
                        break

                    pkt = q.popleft()
                    queue_mgr.current_bytes -= pkt.size_bytes
                    queue_mgr.bytes_by_category[cat] -= pkt.size_bytes

                    self._mark_packet_delivery(pkt, current_time_sec)
                    delivered_packets.append(pkt)
                    bytes_served += pkt.size_bytes

        else:
            # CONGESTED STATE: Strict Priority for Real-Time & Best-Effort, Bulk throttled to quota
            bulk_bytes_cap = max_bytes_this_step * bulk_rate_limit_ratio
            bulk_bytes_served = 0.0

            # Step 1: Real-Time traffic has first access to full link capacity
            while queue_mgr.real_time_queue and (bytes_served < max_bytes_this_step):
                head_pkt = queue_mgr.real_time_queue[0]
                if bytes_served + head_pkt.size_bytes > max_bytes_this_step:
                    break

                pkt = queue_mgr.real_time_queue.popleft()
                queue_mgr.current_bytes -= pkt.size_bytes
                queue_mgr.bytes_by_category[TrafficCategory.REAL_TIME] -= pkt.size_bytes

                self._mark_packet_delivery(pkt, current_time_sec)
                delivered_packets.append(pkt)
                bytes_served += pkt.size_bytes

            # Step 2: Best-Effort traffic receives second priority
            while queue_mgr.best_effort_queue and (bytes_served < max_bytes_this_step):
                head_pkt = queue_mgr.best_effort_queue[0]
                if bytes_served + head_pkt.size_bytes > max_bytes_this_step:
                    break

                pkt = queue_mgr.best_effort_queue.popleft()
                queue_mgr.current_bytes -= pkt.size_bytes
                queue_mgr.bytes_by_category[TrafficCategory.BEST_EFFORT] -= pkt.size_bytes

                self._mark_packet_delivery(pkt, current_time_sec)
                delivered_packets.append(pkt)
                bytes_served += pkt.size_bytes

            # Step 3: Bulk traffic receives remaining capacity, capped strictly at bulk_bytes_cap
            while queue_mgr.bulk_queue and (bytes_served < max_bytes_this_step):
                head_pkt = queue_mgr.bulk_queue[0]
                if (bulk_bytes_served + head_pkt.size_bytes > bulk_bytes_cap) or \
                   (bytes_served + head_pkt.size_bytes > max_bytes_this_step):
                    # Throttled by adaptive policy or link boundary reached
                    break

                pkt = queue_mgr.bulk_queue.popleft()
                queue_mgr.current_bytes -= pkt.size_bytes
                queue_mgr.bytes_by_category[TrafficCategory.BULK] -= pkt.size_bytes

                self._mark_packet_delivery(pkt, current_time_sec)
                delivered_packets.append(pkt)
                bytes_served += pkt.size_bytes
                bulk_bytes_served += pkt.size_bytes

        return delivered_packets
