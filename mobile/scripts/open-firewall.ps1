# Allow Nurse Care dev servers through Windows Firewall for physical phones on Wi-Fi.
# Run PowerShell as Administrator:
#   cd mobile
#   npm run open-firewall

$ErrorActionPreference = "Stop"

function Add-DevFirewallRule {
  param(
    [string]$DisplayName,
    [int]$Port,
    [string]$Description
  )

  $existing = Get-NetFirewallRule -DisplayName $DisplayName -ErrorAction SilentlyContinue
  if ($existing) {
    Write-Host "Firewall rule already exists: $DisplayName" -ForegroundColor Yellow
    return
  }

  New-NetFirewallRule `
    -DisplayName $DisplayName `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort $Port `
    -Action Allow `
    -Profile Private `
    -Description $Description

  Write-Host "Added firewall rule: $DisplayName (Private networks, TCP $Port)" -ForegroundColor Green
}

Add-DevFirewallRule `
  -DisplayName "Nurse Care API (5050)" `
  -Port 5050 `
  -Description "Allows mobile devices on LAN to reach the Nurse Care Express API during development"

Add-DevFirewallRule `
  -DisplayName "Nurse Care Metro (8010)" `
  -Port 8010 `
  -Description "Allows Expo Go on a physical phone to download the JS bundle from Metro during development"
