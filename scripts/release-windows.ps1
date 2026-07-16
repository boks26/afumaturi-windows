param(
    [string]$Server = "169.58.28.222",
    [string]$SshUser = "afumaturi",
    [string]$RemoteDirectory = "/var/www/afumaturi-updates",
    [string]$PublicBaseUrl = "https://afumaturi-api.duckdns.org/updates",
    [string]$SshKeyPath = "$env:USERPROFILE\.ssh\afumaturi_contabo",
    [string]$SigningKeyPath = "$env:USERPROFILE\.tauri\afumaturi-updater.key",
    [switch]$SkipBuild
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
        throw "$Description a esuat (cod $LASTEXITCODE)."
    }
}

foreach ($command in @("git.exe", "npm.cmd", "rustup.exe", "scp.exe", "ssh.exe")) {
    if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
        throw "Comanda $command nu este disponibila in PATH."
    }
}

$workingTreeChanges = @(& git.exe status --porcelain)
if ($LASTEXITCODE -ne 0) {
    throw "Starea repository-ului Git nu a putut fi verificata."
}
if ($workingTreeChanges.Count -gt 0) {
    throw "Repository-ul contine modificari nepublicate. Ruleaza git status si salveaza-le inainte de release.`n$($workingTreeChanges -join "`n")"
}

foreach ($file in @($SshKeyPath)) {
    if (-not (Test-Path $file -PathType Leaf)) {
        throw "Fisierul necesar nu exista: $file"
    }
}
if (-not $SkipBuild -and -not (Test-Path $SigningKeyPath -PathType Leaf)) {
    throw "Fisierul necesar nu exista: $SigningKeyPath"
}

$package = Get-Content "$projectRoot\package.json" -Raw | ConvertFrom-Json
$version = [string]$package.version
if ($version -notmatch '^\d+\.\d+\.\d+([-.][0-9A-Za-z.-]+)?$') {
    throw "Versiunea din package.json nu este valida: $version"
}

$tauriConfig = Get-Content "$projectRoot\src-tauri\tauri.conf.json" -Raw | ConvertFrom-Json
if ([string]$tauriConfig.version -ne $version) {
    throw "Versiunile package.json ($version) si tauri.conf.json ($($tauriConfig.version)) nu coincid."
}

Write-Host "Release Afumaturi Windows $version" -ForegroundColor Green
Write-Host "Destinatie: ${SshUser}@${Server}:${RemoteDirectory}"

$llvmBin = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\2022\BuildTools\VC\Tools\Llvm\bin"
if (-not $SkipBuild) {
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

    if (-not (Test-Path "$llvmBin\clang.exe" -PathType Leaf)) {
        throw "Clang lipseste din $llvmBin. Instaleaza componenta Visual Studio VC.Llvm.Clang."
    }
    $env:PATH = "$llvmBin;$env:PATH"
}

$passwordPointer = [IntPtr]::Zero
if (-not $SkipBuild) {
    $securePassword = Read-Host "Parola cheii Tauri updater" -AsSecureString
    $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
}
$temporaryDirectory = Join-Path ([IO.Path]::GetTempPath()) "afumaturi-release-$([Guid]::NewGuid())"

try {
    if (-not $SkipBuild) {
        $env:TAURI_SIGNING_PRIVATE_KEY = Get-Content $SigningKeyPath -Raw
        $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
        Invoke-Checked "Instalare exacta dependente" { & npm.cmd ci }
        Invoke-Checked "Build si semnare Windows x64" { & npm.cmd run tauri:build:x64 }
        Invoke-Checked "Build si semnare Windows x32" { & npm.cmd run tauri:build:x86 }
        Invoke-Checked "Build si semnare Windows ARM64" { & npm.cmd run tauri:build:arm64 }
    }

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
                throw "Artefactul lipseste: $artifact"
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
        notes = "Actualizare Afumaturi pentru Windows x64, x32 si ARM64."
        pub_date = [DateTime]::UtcNow.ToString("o")
        platforms = $platforms
    }
    $manifestJson = $manifest | ConvertTo-Json -Depth 6
    [IO.File]::WriteAllText($manifestPath, $manifestJson, [Text.UTF8Encoding]::new($false))
    $uploadFiles.Add($manifestPath)

    $destination = "${SshUser}@${Server}:${RemoteDirectory}/"
    Invoke-Checked "Upload artefacte catre Contabo" {
        & scp.exe -i $SshKeyPath -o IdentitiesOnly=yes -o PasswordAuthentication=no @uploadFiles $destination
    }

    $remoteCommands = @(
        "cd '$RemoteDirectory'",
        "ln -sfn 'Afumaturi_${version}_x64-setup.exe' 'Afumaturi-Windows-x64-Setup.exe'",
        "ln -sfn 'Afumaturi_${version}_x86-setup.exe' 'Afumaturi-Windows-x86-Setup.exe'",
        "ln -sfn 'Afumaturi_${version}_arm64-setup.exe' 'Afumaturi-Windows-arm64-Setup.exe'",
        "mv 'latest.json.upload' 'latest.json'"
    ) -join " && "

    Invoke-Checked "Activare release pe Contabo" {
        & ssh.exe -i $SshKeyPath -o IdentitiesOnly=yes -o PasswordAuthentication=no "${SshUser}@${Server}" $remoteCommands
    }

    Write-Host "`nRelease $version publicat cu succes." -ForegroundColor Green
    Write-Host "$PublicBaseUrl/latest.json"
}
finally {
    if ($passwordPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    }
    Remove-Item Env:TAURI_SIGNING_PRIVATE_KEY -ErrorAction SilentlyContinue
    Remove-Item Env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD -ErrorAction SilentlyContinue
    if (Test-Path $temporaryDirectory) {
        Remove-Item $temporaryDirectory -Recurse -Force
    }
}
