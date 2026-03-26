param(
  [string]$Scheme = "relaydrive-dev"
)

# Determine dev exe path for Tauri v2 (Rust crate in src-tauri)
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ExeCandidates = @(
  (Join-Path $ProjectRoot 'src-tauri\target\debug\app.exe'),
  (Join-Path $ProjectRoot 'src-tauri\target\debug\RelayDrive.exe'),
  (Join-Path $ProjectRoot 'target\debug\RelayDrive.exe'),
  (Join-Path $ProjectRoot 'target\debug\app.exe')
)

$DevExe = $null
foreach ($c in $ExeCandidates) {
  if (Test-Path $c) { $DevExe = (Resolve-Path $c).Path; break }
}

if (-not $DevExe) {
  Write-Error "Dev executable not found. Please run 'npm run tauri:dev' once to build the debug exe, then re-run this script."
  exit 1
}

$Base = "HKCU:\Software\Classes\$Scheme"
New-Item -Path $Base -Force | Out-Null
New-ItemProperty -Path $Base -Name "(default)" -Value "URL:$Scheme Protocol" -PropertyType String -Force | Out-Null
New-ItemProperty -Path $Base -Name "URL Protocol" -Value "" -PropertyType String -Force | Out-Null

# Optional icon
New-Item -Path "$Base\DefaultIcon" -Force | Out-Null
New-ItemProperty -Path "$Base\DefaultIcon" -Name "(default)" -Value "$DevExe,0" -PropertyType String -Force | Out-Null

# Open command
New-Item -Path "$Base\shell\open\command" -Force | Out-Null
$Cmd = "`"$DevExe`" `"%1`""
New-ItemProperty -Path "$Base\shell\open\command" -Name "(default)" -Value $Cmd -PropertyType String -Force | Out-Null

Write-Host "Registered $Scheme -> $DevExe"
