param(
    [string]$Server = "169.58.28.222",
    [string]$SshUser = "afumaturi",
    [string]$RemoteDirectory = "/var/www/afumaturi-updates",
    [string]$PublicBaseUrl = "https://afumaturi-api.duckdns.org/updates",
    [string]$SshKeyPath = "$env:USERPROFILE\.ssh\afumaturi_contabo",
    [string]$SigningKeyPath = "$env:USERPROFILE\.tauri\afumaturi-updater.key"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

function Invoke-Checked {
    param(
        [Parameter(Mandatory = $true)][string]$Description,
        [Parameter(Mandatory = $true)][scriptblock]$Command
    )

    Write-Host "`n==> $Description" -ForegroundColor Cyan
    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "$Description a eșuat (cod $LASTEXITCODE)."
    }
}

foreach ($command in @("npm.cmd", "rustup.exe", "scp.exe", "ssh.exe")) {
    if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
        throw "Comanda $command nu este disponibilă în PATH."
    }
}

foreach ($file in @($SshKeyPath, $SigningKeyPath)) {
    if (-not (Test-Path $file -PathType Leaf)) {
        throw "Fișierul necesar nu există: $file"
    }
}

$package = Get-Content "$projectRoot\package.json" -Raw | ConvertFrom-Json
$version = [string]$package.version
if ($version -notmatch '^\d+\.\d+\.\d+([-.][0-9A-Za-z.-]+)?$') {
    throw "Versiunea din package.json nu este validă: $version"
}

$tauriConfig = Get-Content "$projectRoot\src-tauri\tauri.conf.json" -Raw | ConvertFrom-Json
if ([string]$tauriConfig.version -ne $version) {
    throw "Versiunile package.json ($version) și tauri.conf.json ($($tauriConfig.version)) nu coincid."
}

Write-Host "Release Afumături Windows $version" -ForegroundColor Green
Write-Host "Destinație: ${SshUser}@${Server}:${RemoteDirectory}"

$installedTargets = & rustup.exe target list --installed
foreach ($target in @(
    "x86_64-pc-windows-msvc",
    "i686-pc-windows-msvc",
    "aarch64-pc-windows-msvc"
)) {
    if ($installedTargets -notcontains $target) {
        Invoke-Checked "Instalare target Rust $target" { & rustup.exe target add $target }
    }
}

$llvmBin = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\2022\BuildTools\VC\Tools\Llvm\bin"
if (-not (Test-Path "$llvmBin\clang.exe" -PathType Leaf)) {
    throw "Clang lipsește din $llvmBin. Instalează componenta Visual Studio VC.Llvm.Clang."
}
$env:PATH = "$llvmBin;$env:PATH"

$securePassword = Read-Host "Parola cheii Tauri updater" -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
$temporaryDirectory = Join-Path ([IO.Path]::GetTempPath()) "afumaturi-release-$([Guid]::NewGuid())"

try {
    $env:TAURI_SIGNING_PRIVATE_KEY = Get-Content $SigningKeyPath -Raw
    $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)

    Invoke-Checked "Instalare exactă dependențe" { & npm.cmd ci }
    Invoke-Checked "Build și semnare Windows x64" { & npm.cmd run tauri:build:x64 }
    Invoke-Checked "Build și semnare Windows x32" { & npm.cmd run tauri:build:x86 }
    Invoke-Checked "Build și semnare Windows ARM64" { & npm.cmd run tauri:build:arm64 }

    $artifacts = [ordered]@{
        "windows-x86_64" = "$projectRoot\src-tauri\target\x86_64-pc-windows-msvc\release\bundle\nsis\Afumaturi_${version}_x64-setup.exe"
        "windows-i686" = "$projectRoot\src-tauri\target\i686-pc-windows-msvc\release\bundle\nsis\Afumaturi_${version}_x86-setup.exe"
        "windows-aarch64" = "$projectRoot\src-tauri\target\aarch64-pc-windows-msvc\release\bundle\nsis\Afumaturi_${version}_arm64-setup.exe"
    }

    $uploadFiles = [System.Collections.Generic.List[string]]::new()
    $platforms = [ordered]@{}
    foreach ($entry in $artifacts.GetEnumerator()) {
        $installer = $entry.Value
        $signature = "$installer.sig"
        foreach ($artifact in @($installer, $signature)) {
            if (-not (Test-Path $artifact -PathType Leaf)) {
                throw "Artefactul lipsește: $artifact"
            }
            $uploadFiles.Add($artifact)
        }

        $platforms[$entry.Key] = [ordered]@{
            signature = (Get-Content $signature -Raw).Trim()
            url = "$PublicBaseUrl/$([IO.Path]::GetFileName($installer))"
        }
    }

    New-Item -ItemType Directory -Path $temporaryDirectory | Out-Null
    $manifestPath = Join-Path $temporaryDirectory "latest.json.upload"
    $manifest = [ordered]@{
        version = $version
        notes = "Actualizare Afumături pentru Windows x64, x32 și ARM64."
        pub_date = [DateTime]::UtcNow.ToString("o")
        platforms = $platforms
    }
    $manifestJson = $manifest | ConvertTo-Json -Depth 6
    [IO.File]::WriteAllText($manifestPath, $manifestJson, [Text.UTF8Encoding]::new($false))
    $uploadFiles.Add($manifestPath)

    $destination = "${SshUser}@${Server}:${RemoteDirectory}/"
    Invoke-Checked "Upload artefacte către Contabo" {
        & scp.exe -i $SshKeyPath @uploadFiles $destination
    }

    $remoteCommands = @(
        "cd '$RemoteDirectory'",
        "ln -sfn 'Afumaturi_${version}_x64-setup.exe' 'Afumaturi-Windows-x64-Setup.exe'",
        "ln -sfn 'Afumaturi_${version}_x86-setup.exe' 'Afumaturi-Windows-x86-Setup.exe'",
        "ln -sfn 'Afumaturi_${version}_arm64-setup.exe' 'Afumaturi-Windows-arm64-Setup.exe'",
        "mv 'latest.json.upload' 'latest.json'"
    ) -join " && "

    Invoke-Checked "Activare release pe Contabo" {
        & ssh.exe -i $SshKeyPath "${SshUser}@${Server}" $remoteCommands
    }

    Write-Host "`nRelease $version publicat cu succes." -ForegroundColor Green
    Write-Host "$PublicBaseUrl/latest.json"
}
finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    Remove-Item Env:TAURI_SIGNING_PRIVATE_KEY -ErrorAction SilentlyContinue
    Remove-Item Env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD -ErrorAction SilentlyContinue
    if (Test-Path $temporaryDirectory) {
        Remove-Item $temporaryDirectory -Recurse -Force
    }
}
