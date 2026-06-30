# Stop API on 5050 so Prisma can replace query_engine-windows.dll.node (avoids EPERM on Windows).
$conn = Get-NetTCPConnection -LocalPort 5050 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($conn) {
  Write-Host "Stopping process on port 5050 (PID $($conn.OwningProcess))..."
  Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 2
}
Set-Location $PSScriptRoot\..
npx prisma generate
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "Done. Run: npm start"
