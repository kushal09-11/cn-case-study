# PowerShell Startup Script for Wi-Fi Congestion & QoS Simulation Platform

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Starting Wi-Fi Congestion & QoS Simulation Platform     " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$workspaceRoot = $PSScriptRoot

# Function to free a port if already occupied
function Stop-PortOwner($port) {
    $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($conns) {
        foreach ($conn in $conns) {
            $pidToKill = $conn.OwningProcess
            if ($pidToKill -and $pidToKill -ne 0) {
                Write-Host "Port $port is currently in use by PID $pidToKill. Terminating previous instance..." -ForegroundColor Yellow
                Stop-Process -Id $pidToKill -Force -ErrorAction SilentlyContinue
            }
        }
        Start-Sleep -Milliseconds 800
    }
}

# Free port 8000 and 5173 if dangling from earlier runs
Stop-PortOwner 8000
Stop-PortOwner 5173

# 1. Start Backend FastAPI Server
Write-Host "`n[1/2] Starting Python FastAPI Backend on http://localhost:8000..." -ForegroundColor Yellow
$backendCmd = "cd '$workspaceRoot\backend'; .\venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"
Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", $backendCmd

# Wait 2 seconds for backend initialization
Start-Sleep -Seconds 2

# 2. Start Frontend Vite Dev Server
Write-Host "`n[2/2] Starting React Vite Frontend on http://localhost:5173..." -ForegroundColor Yellow
$frontendCmd = "cd '$workspaceRoot\frontend'; npm run dev"
Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", $frontendCmd

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host " Services Successfully Launched!" -ForegroundColor Green
Write-Host " Frontend: http://localhost:5173" -ForegroundColor White
Write-Host " Backend:  http://localhost:8000" -ForegroundColor White
Write-Host " API Docs: http://localhost:8000/docs" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Green
