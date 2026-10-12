"""Traffic Presets for Low, Medium, and High load scenarios.

Each preset provides a calibrated, deterministic traffic matrix designed to test
uncongested, near-capacity, and severe bufferbloat/overload scenarios.
"""

from typing import List, Dict
from app.simulation.models import SimulationConfig, FlowConfig, TrafficCategory, QoSMode


def get_preset_flows(preset_name: str) -> List[FlowConfig]:
    name = preset_name.lower().strip()
    if name == "low":
        # 3 flows: Total offered load = 3 + 7 + 10 = 20.0 Mbps (40% load on 50 Mbps link)
        return [
            FlowConfig(
                flow_id="flow_rt_1",
                client_id="client_1",
                client_name="Laptop 1 (Zoom Video Call)",
                category=TrafficCategory.REAL_TIME,
                offered_load_mbps=3.0,
                packet_size_bytes=250,
                priority=1
            ),
            FlowConfig(
                flow_id="flow_be_1",
                client_id="client_2",
                client_name="Desktop (Web Browsing)",
                category=TrafficCategory.BEST_EFFORT,
                offered_load_mbps=7.0,
                packet_size_bytes=1000,
                priority=2
            ),
            FlowConfig(
                flow_id="flow_bulk_1",
                client_id="client_3",
                client_name="Smart TV (Cloud Backup)",
                category=TrafficCategory.BULK,
                offered_load_mbps=10.0,
                packet_size_bytes=1500,
                priority=3
            ),
        ]
    elif name == "medium":
        # 4 flows: Total offered load = 5 + 3 + 15 + 22 = 45.0 Mbps (90% load on 50 Mbps link)
        return [
            FlowConfig(
                flow_id="flow_rt_1",
                client_id="client_1",
                client_name="Laptop 1 (Online Class Video)",
                category=TrafficCategory.REAL_TIME,
                offered_load_mbps=5.0,
                packet_size_bytes=250,
                priority=1
            ),
            FlowConfig(
                flow_id="flow_rt_2",
                client_id="client_2",
                client_name="Phone (Discord Voice Call)",
                category=TrafficCategory.REAL_TIME,
                offered_load_mbps=3.0,
                packet_size_bytes=160,
                priority=1
            ),
            FlowConfig(
                flow_id="flow_be_1",
                client_id="client_3",
                client_name="Workstation (E-commerce / Web)",
                category=TrafficCategory.BEST_EFFORT,
                offered_load_mbps=15.0,
                packet_size_bytes=1000,
                priority=2
            ),
            FlowConfig(
                flow_id="flow_bulk_1",
                client_id="client_4",
                client_name="NAS Server (System Backup)",
                category=TrafficCategory.BULK,
                offered_load_mbps=22.0,
                packet_size_bytes=1500,
                priority=3
            ),
        ]
    else:  # "high" preset default
        # 6 flows: Total offered load = 6 + 6 + 15 + 15 + 20 + 20 = 82.0 Mbps (>164% load on 50 Mbps link)
        return [
            FlowConfig(
                flow_id="flow_rt_1",
                client_id="client_1",
                client_name="Executive Laptop (VIP Video Conf)",
                category=TrafficCategory.REAL_TIME,
                offered_load_mbps=6.0,
                packet_size_bytes=250,
                priority=1
            ),
            FlowConfig(
                flow_id="flow_rt_2",
                client_id="client_2",
                client_name="Telehealth Terminal (Live Stream)",
                category=TrafficCategory.REAL_TIME,
                offered_load_mbps=6.0,
                packet_size_bytes=250,
                priority=1
            ),
            FlowConfig(
                flow_id="flow_be_1",
                client_id="client_3",
                client_name="Office PC 1 (Cloud Drive Sync)",
                category=TrafficCategory.BEST_EFFORT,
                offered_load_mbps=15.0,
                packet_size_bytes=1000,
                priority=2
            ),
            FlowConfig(
                flow_id="flow_be_2",
                client_id="client_4",
                client_name="Office PC 2 (High-Res Media)",
                category=TrafficCategory.BEST_EFFORT,
                offered_load_mbps=15.0,
                packet_size_bytes=1000,
                priority=2
            ),
            FlowConfig(
                flow_id="flow_bulk_1",
                client_id="client_5",
                client_name="Developer PC (Docker Image Pull)",
                category=TrafficCategory.BULK,
                offered_load_mbps=20.0,
                packet_size_bytes=1500,
                priority=3
            ),
            FlowConfig(
                flow_id="flow_bulk_2",
                client_id="client_6",
                client_name="Torrent Seedbox (P2P Transfer)",
                category=TrafficCategory.BULK,
                offered_load_mbps=20.0,
                packet_size_bytes=1500,
                priority=3
            ),
        ]


def create_default_config(preset: str = "high", qos_mode: QoSMode = QoSMode.BASELINE) -> SimulationConfig:
    flows = get_preset_flows(preset)
    return SimulationConfig(
        simulation_id=f"sim_{preset}_{qos_mode.value}",
        preset_name=preset.lower().strip(),
        duration_seconds=30.0,
        time_step_seconds=0.1,
        bottleneck_capacity_mbps=50.0,
        queue_capacity_bytes=500_000,
        random_seed=42,
        qos_mode=qos_mode,
        flows=flows
    )
