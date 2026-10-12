"""FastAPI Main Application Entry Point."""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import router
from app.services.simulation_service import simulation_service

app = FastAPI(
    title="Adaptive Wi-Fi Congestion Detection & QoS Simulation",
    description="Software simulation engine modeling virtual Wi-Fi link contention, FIFO baseline, static QoS, and adaptive QoS.",
    version="1.0.0"
)

# CORS middleware for local Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")


@app.websocket("/ws/simulation")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    await simulation_service.register_ws(websocket)
    # Immediately send current state
    await websocket.send_text(import_json_dumps(simulation_service.get_status_dict()))
    try:
        while True:
            # Keep socket alive or receive control commands
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text('{"type": "pong"}')
    except WebSocketDisconnect:
        simulation_service.unregister_ws(websocket)
    except Exception:
        simulation_service.unregister_ws(websocket)


def import_json_dumps(obj):
    import json
    return json.dumps(obj)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
