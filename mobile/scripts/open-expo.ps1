# Open the Nurse Care project in Expo Go on a running Android emulator.
param(
  [int]$MetroPort = 8010
)

$ErrorActionPreference = "Stop"
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path

& powershell -ExecutionPolicy Bypass -File (Join-Path $scriptsDir "tunnel.ps1") -MetroPorts @($MetroPort, 8081, 8082)

$adb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
if (-not (Test-Path $adb)) {
  Write-Error "adb not found at $adb"
}

$devices = & $adb devices | Select-String 'emulator-\d+\s+device'
if (-not $devices) {
  Write-Error "No Android emulator detected. Start Pixel_7 (or your AVD) in Android Studio first."
}

$expoGo = & $adb shell pm list packages 2>$null | Select-String 'host.exp.exponent'
if (-not $expoGo) {
  Write-Warning "Expo Go is not installed on this emulator."
  Write-Host "Open Play Store on the emulator, search 'Expo Go', install it, then run: npm run open:emulator"
  exit 1
}

$url = "exp://127.0.0.1:$MetroPort"
Write-Host "Opening $url in Expo Go..." -ForegroundColor Cyan
& $adb shell am start -a android.intent.action.VIEW -d $url host.exp.exponent | Out-Null
Write-Host "If the screen stays blank, wait for Metro to finish bundling, then run: npm run open:emulator" -ForegroundColor Green
