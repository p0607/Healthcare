# Same as start-emulator.ps1 but also opens the app on the connected emulator/device.
$ErrorActionPreference = "Stop"
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$mobileRoot = Split-Path -Parent $scriptsDir

Set-Location $mobileRoot

& powershell -ExecutionPolicy Bypass -File (Join-Path $scriptsDir "setup-env.ps1") -Mode emulator
& powershell -ExecutionPolicy Bypass -File (Join-Path $scriptsDir "tunnel.ps1")
npx expo start --port 8010 --localhost --android --clear
