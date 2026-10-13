"""FastAPI TestClient integration tests for REST endpoints."""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_api_health():
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"


def test_api_config_get_and_put():
    resp = client.get("/api/config")
    assert resp.status_code == 200
    data = resp.json()
    assert "bottleneck_capacity_mbps" in data
    assert "flows" in data

    put_resp = client.put("/api/config", json={
        "preset_name": "medium",
        "bottleneck_capacity_mbps": 60.0
    })
    assert put_resp.status_code == 200
    assert put_resp.json()["config"]["bottleneck_capacity_mbps"] == 60.0


def test_api_topology():
    resp = client.get("/api/topology")
    assert resp.status_code == 200
    data = resp.json()
    assert "nodes" in data
    assert "edges" in data
    assert any(n["id"] == "node_router" for n in data["nodes"])


def test_api_run_comparison():
    resp = client.post("/api/experiments/run-comparison", json={
        "preset_name": "high",
        "bottleneck_capacity_mbps": 40.0,
        "duration_seconds": 2.0,
        "random_seed": 42
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "baseline" in data
    assert "static_qos" in data
    assert "adaptive_qos" in data


<<<<<<< HEAD
def test_api_qos_decision():
    resp = client.get("/api/qos/decision")
    assert resp.status_code == 200
    data = resp.json()
    assert "latest_decision" in data
    assert "active_policy" in data


def test_api_simulation_lifecycle():
    # Start
    start_resp = client.post("/api/simulation/start")
    assert start_resp.status_code == 200
    assert start_resp.json()["status"]["is_running"] is True

    # Pause
    pause_resp = client.post("/api/simulation/pause")
    assert pause_resp.status_code == 200
    assert pause_resp.json()["status"]["is_paused"] is True

    # Resume
    resume_resp = client.post("/api/simulation/resume")
    assert resume_resp.status_code == 200
    assert resume_resp.json()["status"]["is_running"] is True

    # Reset
    reset_resp = client.post("/api/simulation/reset")
    assert reset_resp.status_code == 200
    assert reset_resp.json()["status"]["is_running"] is False
    assert reset_resp.json()["status"]["current_step"] == 0
=======
def test_api_new_scenario():
    # Calling new-scenario generates a fresh random scenario
    resp1 = client.post("/api/simulation/new-scenario")
    assert resp1.status_code == 200
    data1 = resp1.json()
    assert "scenario" in data1
    assert "seed" in data1["scenario"]
    assert 3 <= data1["scenario"]["num_clients"] <= 7

    # Calling with a specific seed produces deterministic result
    resp2 = client.post("/api/simulation/new-scenario?seed=54321")
    assert resp2.status_code == 200
    data2 = resp2.json()["scenario"]
    assert data2["seed"] == 54321

    resp3 = client.post("/api/simulation/new-scenario?seed=54321")
    data3 = resp3.json()["scenario"]
    assert data2["num_clients"] == data3["num_clients"]
    assert data2["baseline_offered_load_mbps"] == data3["baseline_offered_load_mbps"]


def test_api_topology_has_queue_and_server():
    resp = client.get("/api/topology")
    assert resp.status_code == 200
    data = resp.json()
    node_ids = [n["id"] for n in data["nodes"]]
    assert "node_router" in node_ids
    assert "node_queue" in node_ids
    assert "node_server" in node_ids
    assert "node_monitor" in node_ids
    assert "node_controller" in node_ids
>>>>>>> origin/topologyimproved
