"""Traffic generation component for the discrete-time Wi-Fi network simulator.

Generates realistic packet arrivals per flow based on configured offered load,
packet size, category characteristics, and a deterministic PRNG seed.
"""

import math
import random
from typing import List, Dict
from app.simulation.models import FlowConfig, Packet, TrafficCategory


class TrafficGenerator:
    def __init__(self, flows: List[FlowConfig], random_seed: int = 42):
        self.flows = flows
        self.random_seed = random_seed
        self.rng = random.Random(random_seed)
        self.packet_counter = 0

    def reset(self, random_seed: int = 42) -> None:
        """Reset generator with a fresh seed."""
        self.random_seed = random_seed
        self.rng = random.Random(random_seed)
        self.packet_counter = 0

    def generate_step_packets(self, current_time_seconds: float, time_step_seconds: float) -> List[Packet]:
        """
        Generate packets for all flows for the current time step.
        Returns a list of generated Packet objects.
        """
        step_packets: List[Packet] = []

        for flow in self.flows:
            if flow.offered_load_mbps <= 0.0:
                continue

            # Calculate base bytes offered in this time step
            # offered_load_mbps * 1e6 bits/sec * time_step / 8 bits/byte
            base_bytes_per_step = (flow.offered_load_mbps * 1_000_000.0 * time_step_seconds) / 8.0
            
            # Apply traffic characteristics per category
            # Real-time: low variance, periodic packets
            # Best-effort: medium variance, web browsing requests
            # Bulk: high throughput, slight burstiness
            if flow.category == TrafficCategory.REAL_TIME:
                variance = self.rng.uniform(0.96, 1.04)
            elif flow.category == TrafficCategory.BEST_EFFORT:
                variance = self.rng.uniform(0.85, 1.15)
            elif flow.category == TrafficCategory.BULK:
                variance = self.rng.uniform(0.90, 1.10)
            else:
                variance = 1.0

            bytes_to_generate = base_bytes_per_step * variance
            packet_size = max(64, flow.packet_size_bytes)
            num_packets = int(round(bytes_to_generate / packet_size))

            # Distribute packet timestamps evenly across the time step [t, t + dt)
            dt_sub = time_step_seconds / max(1, num_packets)
            for i in range(num_packets):
                self.packet_counter += 1
                pkt_time = current_time_seconds + (i * dt_sub)
                packet = Packet(
                    packet_id=self.packet_counter,
                    flow_id=flow.flow_id,
                    category=flow.category,
                    size_bytes=packet_size,
                    creation_time=pkt_time
                )
                step_packets.append(packet)

        return step_packets
