# Allow inbound TCP 5050 for Nurse Care API (physical phone on same Wi-Fi).
param(
  [int]$Port = 5050
)

$ruleName = "Nurse Care API (port $Port)"

$existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
if ($existing) {
  Write-Host "Firewall rule already exists: $ruleName" -ForegroundColor Green
  exit 0
}

try {
  New-NetFirewallRule `
    -DisplayName $ruleName `
    -Direction Inbound `
    -Action Allow `
    -Protocol TCP `
    -LocalPort $Port `
    -Profile Private, Domain `
    | Out-Null
  Write-Host "Added firewall rule: $ruleName" -ForegroundColor Green
  Write-Host "Physical phones on the same Wi-Fi can now reach http://<your-pc-ip>:$Port" -ForegroundColor Cyan
} catch {
  Write-Warning "Could not add firewall rule (run PowerShell as Administrator): $($_.Exception.Message)"
  Write-Host "Or allow port $Port manually in Windows Defender Firewall." -ForegroundColor Yellow
}
