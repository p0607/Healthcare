# Configure .env for emulator, free dev ports, set adb tunnels, start Expo on localhost.
$ErrorActionPreference = "Stop"
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$mobileRoot = Split-Path -Parent $scriptsDir

Set-Location $mobileRoot

& powershell -ExecutionPolicy Bypass -File (Join-Path $scriptsDir "kill-ports.ps1") -Ports @(8010, 8081, 8082)
& powershell -ExecutionPolicy Bypass -File (Join-Path $scriptsDir "setup-env.ps1") -Mode emulator
& powershell -ExecutionPolicy Bypass -File (Join-Path $scriptsDir "tunnel.ps1")

Write-Host ""
Write-Host "Metro starting on http://localhost:8010" -ForegroundColor Cyan
Write-Host "After Metro is ready, open a SECOND terminal and run:" -ForegroundColor Yellow
Write-Host "  npm run open:emulator" -ForegroundColor Yellow
Write-Host "(Do NOT press 'a' - that adb shortcut often fails on Windows.)" -ForegroundColor Yellow
Write-Host ""

$env:CI = '1'
npx expo start --port 8010 --localhost --clear
