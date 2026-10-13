"""Traffic Presets for Low, Medium, and High load scenarios.

Each preset provides a calibrated, deterministic traffic matrix designed to test
uncongested, near-capacity, and severe bufferbloat/overload scenarios.
"""

from typing import List, Dict, Tuple, Optional, Any
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


<<<<<<< HEAD
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
=======
def generate_random_scenario(
    seed: Optional[int] = None,
    bottleneck_capacity_mbps: float = 50.0
) -> Tuple[List[FlowConfig], int, Dict[str, Any]]:
    """
    Generate a realistic, stochastic Wi-Fi network traffic scenario.
    Randomizes:
    - Number of virtual clients (3 to 7)
    - Client categories (balanced mix of Real-Time, Best-Effort, Bulk)
    - Traffic demands (offered load in Mbps) and packet sizes
    - Burst schedules and intensity (causing congestion to vary in timing and severity)
    
    Returns:
        (flows, seed, scenario_metadata)
    """
    import random
    if seed is None:
        seed = random.randint(10000, 999999)
    rng = random.Random(seed)

    candidate_pools = {
        TrafficCategory.REAL_TIME: [
            ("Laptop (Zoom Video Call)", 2.5, 6.0, 250, 1),
            ("Smartphone (Discord Voice)", 1.2, 3.5, 160, 1),
            ("Smart TV (Cloud Gaming)", 4.0, 8.5, 260, 1),
            ("Telehealth Station (Live HD)", 3.0, 6.5, 240, 1),
            ("Tablet (FaceTime HD)", 2.5, 5.0, 220, 1),
            ("VR Headset (Spatial Audio)", 4.5, 9.0, 280, 1),
        ],
        TrafficCategory.BEST_EFFORT: [
            ("Workstation (Web Apps / SaaS)", 5.0, 14.0, 1000, 2),
            ("Desktop (Web Browsing)", 4.0, 10.0, 950, 2),
            ("Smart Display (Media Stream)", 6.0, 15.0, 1100, 2),
            ("Smart TV (4K Video Stream)", 8.0, 18.0, 1250, 2),
            ("Tablet (Social Media & Video)", 4.0, 12.0, 900, 2),
            ("Office Laptop (Cloud CRM)", 5.5, 13.0, 1050, 2),
        ],
        TrafficCategory.BULK: [
            ("NAS Storage (Cloud Backup)", 12.0, 25.0, 1500, 3),
            ("Developer PC (Docker Pull)", 14.0, 28.0, 1500, 3),
            ("Gaming Console (Game Patch)", 15.0, 30.0, 1500, 3),
            ("Home Server (Database Sync)", 10.0, 22.0, 1480, 3),
            ("Download Station (Large ISO)", 15.0, 28.0, 1500, 3),
            ("Torrent Seedbox (P2P Sync)", 12.0, 24.0, 1500, 3),
        ]
    }

    num_clients = rng.randint(3, 7)

    # Guarantee at least 1 Real-time, 1 Best-effort, 1 Bulk
    categories_to_pick = [
        TrafficCategory.REAL_TIME,
        TrafficCategory.BEST_EFFORT,
        TrafficCategory.BULK
    ]

    all_cats = [TrafficCategory.REAL_TIME, TrafficCategory.BEST_EFFORT, TrafficCategory.BULK]
    weights = [0.30, 0.40, 0.30]

    for _ in range(num_clients - 3):
        picked = rng.choices(all_cats, weights=weights, k=1)[0]
        categories_to_pick.append(picked)

    rng.shuffle(categories_to_pick)

    # Track used candidates per category to avoid duplicate client names
    used_indices: Dict[TrafficCategory, List[int]] = {cat: [] for cat in all_cats}
    flows: List[FlowConfig] = []

    for idx, cat in enumerate(categories_to_pick):
        client_idx = idx + 1
        pool = candidate_pools[cat]
        available_indices = [i for i in range(len(pool)) if i not in used_indices[cat]]
        if not available_indices:
            available_indices = list(range(len(pool)))
        chosen_idx = rng.choice(available_indices)
        used_indices[cat].append(chosen_idx)
        name, min_load, max_load, pkt_size, prio = pool[chosen_idx]

        offered_load = round(rng.uniform(min_load, max_load), 1)

        flows.append(FlowConfig(
            flow_id=f"flow_{cat.value[:2]}_{client_idx}",
            client_id=f"client_{client_idx}",
            client_name=name,
            category=cat,
            offered_load_mbps=offered_load,
            packet_size_bytes=pkt_size,
            priority=prio,
            burst_start_sec=0.0,
            burst_duration_sec=0.0,
            burst_multiplier=1.0
        ))

    # Configure realistic traffic bursts for 1-2 flows
    # Especially bulk and best-effort flows can spike to create congestion periods
    bulk_or_be_flows = [f for f in flows if f.category in (TrafficCategory.BULK, TrafficCategory.BEST_EFFORT)]
    num_burst_flows = min(len(bulk_or_be_flows), rng.randint(1, 2))
    burst_targets = rng.sample(bulk_or_be_flows, num_burst_flows) if bulk_or_be_flows else []

    for bf in burst_targets:
        # Congestion develops at varying times depending on workload
        bf.burst_start_sec = round(rng.uniform(3.0, 9.0), 1)
        bf.burst_duration_sec = round(rng.uniform(6.0, 16.0), 1)
        bf.burst_multiplier = round(rng.uniform(1.4, 2.2), 2)

    total_baseline = sum(f.offered_load_mbps for f in flows)
    # Estimate peak load during burst
    total_peak = sum(
        f.offered_load_mbps * (f.burst_multiplier if f.burst_start_sec > 0 else 1.0)
        for f in flows
>>>>>>> origin/topologyimproved
    )

    if total_peak >= bottleneck_capacity_mbps * 1.4:
        expected = "Severe Overload"
    elif total_peak >= bottleneck_capacity_mbps * 1.05:
        expected = "High Congestion"
    elif total_peak >= bottleneck_capacity_mbps * 0.85:
        expected = "Moderate Congestion"
    else:
        expected = "Light Load"

    meta = {
        "seed": seed,
        "num_clients": len(flows),
        "baseline_offered_load_mbps": round(total_baseline, 1),
        "peak_offered_load_mbps": round(total_peak, 1),
        "expected_congestion": expected,
    }

    return flows, seed, meta


def create_default_config(
    preset: str = "high", 
    qos_mode: QoSMode = QoSMode.BASELINE,
    seed: Optional[int] = None
) -> SimulationConfig:
    name = preset.lower().strip()
    if name == "random":
        flows, actual_seed, meta = generate_random_scenario(seed=seed, bottleneck_capacity_mbps=50.0)
        return SimulationConfig(
            simulation_id=f"sim_random_{actual_seed}_{qos_mode.value}",
            duration_seconds=30.0,
            time_step_seconds=0.1,
            bottleneck_capacity_mbps=50.0,
            queue_capacity_bytes=500_000,
            random_seed=actual_seed,
            qos_mode=qos_mode,
            scenario_name=f"Random Scenario #{actual_seed}",
            flows=flows
        )
    else:
        flows = get_preset_flows(preset)
        actual_seed = seed if seed is not None else 42
        return SimulationConfig(
            simulation_id=f"sim_{preset}_{qos_mode.value}",
            duration_seconds=30.0,
            time_step_seconds=0.1,
            bottleneck_capacity_mbps=50.0,
            queue_capacity_bytes=500_000,
            random_seed=actual_seed,
            qos_mode=qos_mode,
            scenario_name=f"{preset.capitalize()} Load Preset",
            flows=flows
        )
