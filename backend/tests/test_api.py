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
