# Stop Node processes listening on common Nurse Care dev ports.
param(
  [int[]]$Ports = @(8010, 8081, 8082, 5050)
)

$killed = @{}
foreach ($port in $Ports) {
  $listeners = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  foreach ($conn in $listeners) {
    $procId = $conn.OwningProcess
    if ($killed.ContainsKey($procId)) { continue }
    $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
    if ($proc -and $proc.ProcessName -eq 'node') {
      Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
      $killed[$procId] = $true
      Write-Host "Stopped node (PID $procId) on port $port" -ForegroundColor Yellow
    }
  }
}

if ($killed.Count -eq 0) {
  Write-Host "No node listeners on ports: $($Ports -join ', ')" -ForegroundColor Green
}
