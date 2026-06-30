# Diagnose why Pixel_7 (or other AVD) stops or fails to boot.
param(
  [string]$AvdName = 'Pixel_7'
)

$ErrorActionPreference = 'Continue'
$adb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
$emu = Join-Path $env:LOCALAPPDATA 'Android\Sdk\emulator\emulator.exe'
$avdDir = Join-Path $env:USERPROFILE ".android\avd\$AvdName.avd"

Write-Host ""
Write-Host "=== Nurse Care - Android emulator check ===" -ForegroundColor Cyan

if (-not (Test-Path $emu)) {
  Write-Host "FAIL: emulator not found at $emu" -ForegroundColor Red
  exit 1
}

$avds = & $emu -list-avds 2>&1
if ($avds -notcontains $AvdName) {
  Write-Host "FAIL: AVD '$AvdName' not found. Available: $($avds -join ', ')" -ForegroundColor Red
  exit 1
}

$drive = (Split-Path $env:USERPROFILE -Qualifier)
$disk = Get-PSDrive -Name ($drive.TrimEnd(':')) -ErrorAction SilentlyContinue
if ($disk) {
  $freeGb = [math]::Round($disk.Free / 1GB, 1)
  Write-Host "Disk $drive free: ${freeGb} GB" -ForegroundColor $(if ($freeGb -lt 15) { 'Yellow' } else { 'Green' })
  if ($freeGb -lt 12) {
    Write-Host "WARN: Pixel_7 needs about 12+ GB free on $drive for a clean boot." -ForegroundColor Yellow
  }
}

$os = Get-CimInstance Win32_OperatingSystem
$freeRamGb = [math]::Round($os.FreePhysicalMemory / 1MB, 1)
$totalRamGb = [math]::Round($os.TotalVisibleMemorySize / 1MB, 1)
Write-Host "RAM free: ${freeRamGb} GB / ${totalRamGb} GB" -ForegroundColor $(if ($freeRamGb -lt 4) { 'Yellow' } else { 'Green' })
if ($freeRamGb -lt 4) {
  Write-Host "WARN: Close browsers, Metro, and backend before starting the emulator." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "--- adb devices ---" -ForegroundColor Cyan
if (Test-Path $adb) {
  & $adb devices -l
  $boot = (& $adb shell getprop sys.boot_completed 2>$null)
  if ($boot) {
    Write-Host "boot_completed=$boot"
    if ($boot.Trim() -eq '1') {
      $expo = & $adb shell pm path host.exp.exponent 2>$null
      if ($expo) { Write-Host "Expo Go: installed" -ForegroundColor Green }
      else { Write-Host "Expo Go: NOT installed - install from Play Store" -ForegroundColor Yellow }
    } else {
      Write-Host "Emulator still booting - wait for home screen." -ForegroundColor Yellow
    }
  } else {
    Write-Host "No emulator connected or Package Manager not ready yet." -ForegroundColor Yellow
  }
} else {
  Write-Host "adb not found" -ForegroundColor Red
}

if (Test-Path (Join-Path $avdDir 'config.ini')) {
  Write-Host ""
  Write-Host "--- AVD config ($AvdName) ---" -ForegroundColor Cyan
  Get-Content (Join-Path $avdDir 'config.ini') | Select-String '^(hw.ramSize|disk.dataPartition.size|target|image.sysdir)'
  $dirty = Join-Path $avdDir 'snapshots\default_boot\ram.img.dirty'
  if (Test-Path $dirty) {
    Write-Host "WARN: Unclean snapshot (ram.img.dirty). Use Cold Boot in Device Manager." -ForegroundColor Yellow
  }
}

Write-Host ""
Write-Host "--- Recommended fix ---" -ForegroundColor Cyan
Write-Host "1. Free 15-20 GB on C: (Disk Cleanup, Recycle Bin, move large files)."
Write-Host "2. Device Manager -> Pixel_7 -> Cold Boot Now (avoid Wipe unless 15+ GB free)."
Write-Host "3. Wait for home screen; install Expo Go from Play Store if needed."
Write-Host "4. Terminal 1: npm run start:emulator"
Write-Host "5. Terminal 2: npm run open:emulator (do not press a in Metro)"
Write-Host ""
