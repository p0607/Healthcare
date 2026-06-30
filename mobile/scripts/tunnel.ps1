# Re-establishes adb reverse tunnels so the Android emulator can reach Metro and the API.
# Tunnels are cleared every emulator restart — run once after boot: npm run tunnel
#
# Physical phones skip this; they use the PC LAN IP in .env instead.

param(
  [int[]]$MetroPorts = @(8010, 8081, 8082),
  [int]$ApiPort = 5050
)

$adb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
if (-not (Test-Path $adb)) {
  Write-Error "adb not found at $adb. Is the Android SDK installed?"
  exit 1
}

$devices = & $adb devices | Select-String 'emulator-\d+\s+device'
if (-not $devices) {
  Write-Warning "No running emulator detected. Start your AVD first, then re-run: npm run tunnel"
  exit 1
}

foreach ($port in $MetroPorts) {
  & $adb reverse "tcp:$port" "tcp:$port" | Out-Null
}
& $adb reverse "tcp:$ApiPort" "tcp:$ApiPort" | Out-Null

Write-Host "adb reverse tunnels set:" -ForegroundColor Green
& $adb reverse --list
