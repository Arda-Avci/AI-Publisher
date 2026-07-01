<#
.SYNOPSIS
  Sequential Modal deploy for all 3 services (audio, video, image).
  Tracks status, timing, and reports summary.

.USAGE
  .\scripts\deploy_modal_serial.ps1
  .\scripts\deploy_modal_serial.ps1 -Service audio
  .\scripts\deploy_modal_serial.ps1 -DryRun
#>

param(
    [ValidateSet("audio","video","image","all")]
    [string]$Service = "all",
    [switch]$DryRun
)

$ErrorActionPreference = "Continue"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSCommandPath)

$Services = @(
    @{
        Name  = "audio"
        File  = "modal_apps/audio_service.py"
        App   = "ai-publisher-audio"
        Desc  = "Audio and Face Processing"
        Models = @("kokoro","xtts","whisper","f5tts","audioldm2","wav2lip","sadtalker","musetalk","geneface","video-retalking","browser-use")
    }
    @{
        Name  = "image"
        File  = "modal_apps/image_service.py"
        App   = "ai-publisher-image"
        Desc  = "Image Generation"
        Models = @("stablediffusion","realesrgan")
    }
    @{
        Name  = "video"
        File  = "modal_apps/video_service.py"
        App   = "ai-publisher-video"
        Desc  = "Video Generation"
        Models = @("wan","wan25","cogvideox","hunyuan","ltx","mochi","animatediff","dynamicrafter","pyramid-flow","svd","videocrafter","zeroscope")
    }
)

$Targets = if ($Service -eq "all") { $Services } else { $Services | Where-Object { $_.Name -eq $Service } }

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  MODAL SEQUENTIAL DEPLOY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
if ($DryRun) { Write-Host "  [DRY RUN - no commands executed]" -ForegroundColor Yellow }
Write-Host ""

$Results = @()
foreach ($svc in $Targets) {
    $start = Get-Date

    Write-Host "────────────────────────────────────────" -ForegroundColor Magenta
    Write-Host "  Service: $($svc.Name) - $($svc.Desc)" -ForegroundColor Magenta
    Write-Host "  App:     $($svc.App)" -ForegroundColor Magenta
    Write-Host "  File:    $($svc.File)" -ForegroundColor Magenta
    Write-Host "  Models:  $($svc.Models -join ', ')" -ForegroundColor Magenta
    Write-Host "────────────────────────────────────────" -ForegroundColor Magenta

    $filePath = Join-Path $ProjectRoot $svc.File
    if (-not (Test-Path $filePath)) {
        Write-Host "  [SKIP] File not found: $filePath" -ForegroundColor Yellow
        $Results += [PSCustomObject]@{ Service=$svc.Name; Status="SKIP"; Time="0s"; Error="File not found" }
        continue
    }

    if (-not $DryRun) {
        Write-Host "  [DEPLOY] Starting..." -ForegroundColor Green
        $output = & modal deploy $filePath 2>&1
        $exitCode = $LASTEXITCODE
    } else {
        Write-Host "  [DRY-RUN] Would run: modal deploy $filePath" -ForegroundColor Yellow
        $Results += [PSCustomObject]@{ Service=$svc.Name; Status="DRY-RUN"; Time="0s"; Error=$null }
        continue
    }

    $elapsed = [math]::Round(((Get-Date) - $start).TotalSeconds, 0)

    if ($exitCode -eq 0) {
        Write-Host "  [OK] Deploy complete ($($elapsed)s)" -ForegroundColor Green
        $Results += [PSCustomObject]@{ Service=$svc.Name; Status="OK"; Time="$($elapsed)s"; Error=$null }
    } else {
        Write-Host "  [FAIL] Exit code: $exitCode ($($elapsed)s)" -ForegroundColor Red
        $errorLines = ($output | Out-String).Trim()
        if ($errorLines) {
            Write-Host "  Output (last 10 lines):" -ForegroundColor DarkRed
            $errorLines -split "`n" | Select-Object -Last 10 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkRed }
        }
        $Results += [PSCustomObject]@{ Service=$svc.Name; Status="FAIL"; Time="$($elapsed)s"; Error="Exit $exitCode" }
    }
}

# ─── Summary ───
$okCount = ($Results | Where-Object { $_.Status -eq "OK" }).Count
$failCount = ($Results | Where-Object { $_.Status -eq "FAIL" }).Count
$skipCount = ($Results | Where-Object { $_.Status -eq "SKIP" }).Count
$dryCount  = ($Results | Where-Object { $_.Status -eq "DRY-RUN" }).Count
$totalCount = $Results.Count

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host ("  {0,-8} {1,-12} {2,-8} {3}" -f "STATUS","SERVICE","TIME","ERROR") -ForegroundColor Gray
Write-Host ("  " + ("-"*50)) -ForegroundColor Gray
foreach ($r in $Results) {
    $icon = switch ($r.Status) {
        "OK"      { "[OK]" }
        "FAIL"    { "[FAIL]" }
        "SKIP"    { "[SKIP]" }
        "DRY-RUN" { "[DRY]" }
        default   { "[?]" }
    }
    $errInfo = if ($r.Error) { $r.Error } else { "" }
    Write-Host ("  $icon $($r.Status.PadRight(8)) $($r.Service.PadRight(12)) $($r.Time.PadRight(8)) $errInfo")
}
Write-Host ""
Write-Host "  Total: $totalCount | OK: $okCount | FAIL: $failCount | SKIP: $skipCount | DRY: $dryCount" -ForegroundColor Cyan

if ($failCount -gt 0) {
    Write-Host "`n  Warning: $failCount service(s) failed. Check output above." -ForegroundColor Yellow
    exit 1
}

Write-Host "`n  All services deployed successfully." -ForegroundColor Green
exit 0
