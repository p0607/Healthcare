# Configure .env for a physical phone on the same Wi-Fi, then start Expo (LAN URL for QR code).
$ErrorActionPreference = "Stop"
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$mobileRoot = Split-Path -Parent $scriptsDir

Set-Location $mobileRoot

& powershell -ExecutionPolicy Bypass -File (Join-Path $scriptsDir "kill-ports.ps1") -Ports @(8010, 8081, 8082)
& powershell -ExecutionPolicy Bypass -File (Join-Path $scriptsDir "setup-env.ps1") -Mode phone

Write-Host ""
Write-Host "Phone mode: scan the QR code with Expo Go (same Wi-Fi as this PC)." -ForegroundColor Cyan
Write-Host "QR must show exp://192.168.x.x:8010 - NOT exp://127.0.0.1" -ForegroundColor Yellow
Write-Host "Backend must be running: cd backend; npm run dev:clean" -ForegroundColor Yellow
Write-Host "If the app still will not load, run as Admin: cd mobile; npm run open-firewall" -ForegroundColor Yellow
Write-Host ""

npx expo start --port 8010 --clear
