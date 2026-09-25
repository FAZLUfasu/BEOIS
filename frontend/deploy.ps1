param(
    [string]$ProjectRoot = "F:\BEST\BEOIS",
    [string]$FrontendPath = "F:\BEST\BEOIS\frontend"
)

$ErrorActionPreference = "Stop"

function Stop-WithMessage {
    param([string]$Message)
    Write-Host ""
    Write-Host "ERROR: $Message" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "===================================================="
Write-Host " BEOIS WINDOWS APP DEPLOYMENT"
Write-Host "===================================================="

if (-not (Test-Path $FrontendPath)) {
    Stop-WithMessage "Frontend path not found: $FrontendPath"
}

Set-Location $FrontendPath

$tauriConfig = Join-Path $FrontendPath "src-tauri\tauri.conf.json"
$cargoFile   = Join-Path $FrontendPath "src-tauri\Cargo.toml"
$deployDir   = Join-Path $ProjectRoot "deploy\windows"

Write-Host ""
Write-Host "===== 1. VERIFY REQUIRED FILES ====="

$required = @(
    $tauriConfig,
    $cargoFile,
    (Join-Path $FrontendPath "package.json")
)

foreach ($file in $required) {
    if (-not (Test-Path $file)) {
        Stop-WithMessage "Required file missing: $file"
    }
    Write-Host "FOUND: $file"
}

Write-Host ""
Write-Host "===== 2. NORMALIZE TAURI CONFIG ENCODING ====="

$configText = Get-Content $tauriConfig -Raw
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

[System.IO.File]::WriteAllText(
    (Resolve-Path $tauriConfig),
    $configText,
    $utf8NoBom
)

$bytes = Get-Content $tauriConfig -Encoding Byte -TotalCount 4

if (
    $bytes.Count -ge 3 -and
    $bytes[0] -eq 239 -and
    $bytes[1] -eq 187 -and
    $bytes[2] -eq 191
) {
    Stop-WithMessage "UTF-8 BOM still exists in tauri.conf.json"
}

if ($bytes[0] -ne 123) {
    Stop-WithMessage "tauri.conf.json does not start with {"
}

Write-Host "UTF-8 BOM: NONE"

Write-Host ""
Write-Host "===== 3. VALIDATE TAURI JSON ====="

try {
    Get-Content $tauriConfig -Raw | ConvertFrom-Json | Out-Null
    Write-Host "tauri.conf.json: VALID"
}
catch {
    Stop-WithMessage $_.Exception.Message
}

$config = Get-Content $tauriConfig -Raw | ConvertFrom-Json

Write-Host ""
Write-Host "===== 4. APP IDENTITY ====="
Write-Host "Product name : $($config.productName)"
Write-Host "Version      : $($config.version)"
Write-Host "Identifier   : $($config.identifier)"

Write-Host ""
Write-Host "===== 5. TOOLCHAIN ====="
node --version
npm --version
npx tauri --version

if ($LASTEXITCODE -ne 0) {
    Stop-WithMessage "Node/npm/Tauri verification failed."
}

Write-Host ""
Write-Host "===== 6. TYPESCRIPT CHECK ====="
npx tsc --noEmit

if ($LASTEXITCODE -ne 0) {
    Stop-WithMessage "TypeScript check failed."
}

Write-Host "TypeScript: PASS"

Write-Host ""
Write-Host "===== 7. TAURI WINDOWS BUILD ====="
npx tauri build

if ($LASTEXITCODE -ne 0) {
    Stop-WithMessage "Tauri build failed."
}

Write-Host ""
Write-Host "===== 8. LOCATE INSTALLER ====="

$bundleRoot = Join-Path $FrontendPath "src-tauri\target\release\bundle"

if (-not (Test-Path $bundleRoot)) {
    Stop-WithMessage "Bundle directory was not created: $bundleRoot"
}

$installers = Get-ChildItem $bundleRoot -Recurse -File |
    Where-Object { $_.Extension -in @(".exe", ".msi") } |
    Sort-Object LastWriteTime -Descending

if (-not $installers) {
    Stop-WithMessage "No Windows installer found under $bundleRoot"
}

New-Item -ItemType Directory -Force -Path $deployDir | Out-Null

Get-ChildItem $deployDir -File -ErrorAction SilentlyContinue |
    Remove-Item -Force

$copied = @()

foreach ($installer in $installers) {
    $target = Join-Path $deployDir $installer.Name
    Copy-Item $installer.FullName $target -Force
    $copied += Get-Item $target
}

$gitCommit = "UNKNOWN"
try {
    $gitCommit = (git -C $ProjectRoot rev-parse HEAD).Trim()
}
catch {}

$buildInfo = @"
BEOIS Windows Deployment
========================

Product Name : $($config.productName)
Version      : $($config.version)
Identifier   : $($config.identifier)
Git Commit   : $gitCommit
Build Date   : $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Frontend     : $FrontendPath

Installer Files:
$(
    ($copied | ForEach-Object {
        "- $($_.Name) ($([math]::Round($_.Length / 1MB, 2)) MB)"
    }) -join "`r`n"
)
"@

[System.IO.File]::WriteAllText(
    (Join-Path $deployDir "BUILD_INFO.txt"),
    $buildInfo,
    $utf8NoBom
)

Write-Host ""
Write-Host "===== 9. DEPLOYMENT OUTPUT ====="

Get-ChildItem $deployDir |
    Select-Object Name,Length,LastWriteTime |
    Format-Table -AutoSize

Write-Host ""
Write-Host "===================================================="
Write-Host " BEOIS WINDOWS APP DEPLOYMENT COMPLETE"
Write-Host "===================================================="
Write-Host ""
Write-Host "Deployment folder:"
Write-Host $deployDir
