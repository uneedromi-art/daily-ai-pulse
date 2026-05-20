# Register daily job in Windows Task Scheduler
# Run: npm run setup-daily-task

$OutputEncoding = [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
chcp 65001 | Out-Null

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$NodePath = (Get-Command node -ErrorAction SilentlyContinue).Source

if (-not $NodePath) {
    Write-Error "Node.js not found in PATH."
    exit 1
}

# Load .env.local (optional DAILY_NOTIFY_HOUR / MINUTE)
$EnvFile = Join-Path $ProjectRoot ".env.local"
if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $val = $matches[2].Trim().Trim('"').Trim("'")
            if ($key -match '^DAILY_NOTIFY_') { Set-Item -Path "env:$key" -Value $val }
        }
    }
}

$Hour = if ($env:DAILY_NOTIFY_HOUR) { [int]$env:DAILY_NOTIFY_HOUR } else { 8 }
$Minute = if ($env:DAILY_NOTIFY_MINUTE) { [int]$env:DAILY_NOTIFY_MINUTE } else { 0 }

$TaskName = "DailyAIPulse"
$Time = "{0:D2}:{1:D2}" -f $Hour, $Minute

$Action = New-ScheduledTaskAction -Execute $NodePath -Argument "scripts/daily_job.js" -WorkingDirectory $ProjectRoot
$Trigger = New-ScheduledTaskTrigger -Daily -At $Time
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Force | Out-Null

$info = Get-ScheduledTaskInfo -TaskName $TaskName

Write-Host ""
Write-Host "[OK] Scheduled task registered successfully."
Write-Host "  Task name  : $TaskName"
Write-Host "  Schedule   : Every day at $Time (local time)"
Write-Host "  Command    : node scripts/daily_job.js"
Write-Host "  Folder     : $ProjectRoot"
Write-Host "  Next run   : $($info.NextRunTime)"
Write-Host ""
Write-Host "Test now     : npm run daily"
Write-Host "Remove task  : Unregister-ScheduledTask -TaskName '$TaskName' -Confirm:`$false"
Write-Host ""
