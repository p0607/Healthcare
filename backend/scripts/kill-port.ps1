# Stop node processes listening on the API port (avoids "Port already in use" on nodemon restart).
param(
  [int]$Port = 5050
)

$killed = @{}
$listeners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
foreach ($conn in $listeners) {
  $procId = $conn.OwningProcess
  if ($killed.ContainsKey($procId)) { continue }
  $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
  if ($proc -and $proc.ProcessName -eq 'node') {
    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    $killed[$procId] = $true
    Write-Host "Stopped node (PID $procId) on port $Port" -ForegroundColor Yellow
  }
}

if ($killed.Count -eq 0) {
  Write-Host "Port $Port is free (no node listener)" -ForegroundColor Green
}
