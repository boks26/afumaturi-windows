param(
    [string]$Server = "169.58.28.222",
    [string]$SshUser = "afumaturi",
    [string]$RemoteDirectory = "/var/www/afumaturi-updates",
    [string]$PublicBaseUrl = "https://afumaturi-api.duckdns.org/updates",
    [string]$SshKeyPath = "$env:USERPROFILE\.ssh\afumaturi_contabo",
    [string]$SigningKeyPath = "$env:USERPROFILE\.tauri\afumaturi-updater.key",
    [switch]$NonInteractive,
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
if (-not $SkipBuild -and -not $env:TAURI_SIGNING_PRIVATE_KEY -and -not (Test-Path $SigningKeyPath -PathType Leaf)) {
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

    $clang = Get-Command clang.exe -ErrorAction SilentlyContinue
    if (-not $clang) {
        throw "Clang lipseste din PATH. Instaleaza componenta Visual Studio VC.Llvm.Clang."
    }
}

$passwordPointer = [IntPtr]::Zero
if (-not $SkipBuild -and -not $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD) {
    if ($NonInteractive) {
        throw "TAURI_SIGNING_PRIVATE_KEY_PASSWORD lipseste in modul neinteractiv."
    }
    $securePassword = Read-Host "Parola cheii Tauri updater" -AsSecureString
    $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
}
$temporaryDirectory = Join-Path ([IO.Path]::GetTempPath()) "afumaturi-release-$([Guid]::NewGuid())"

try {
    $artifacts = [ordered]@{
        "windows-x86_64" = [ordered]@{
            Description = "Build si semnare Windows x64"
            Script = "tauri:build:x64"
            Installer = "$projectRoot\src-tauri\target\x86_64-pc-windows-msvc\release\bundle\nsis\Afumaturi_${version}_x64-setup.exe"
        }
        "windows-i686" = [ordered]@{
            Description = "Build si semnare Windows x32"
            Script = "tauri:build:x86"
            Installer = "$projectRoot\src-tauri\target\i686-pc-windows-msvc\release\bundle\nsis\Afumaturi_${version}_x86-setup.exe"
        }
        "windows-aarch64" = [ordered]@{
            Description = "Build si semnare Windows ARM64"
            Script = "tauri:build:arm64"
            Installer = "$projectRoot\src-tauri\target\aarch64-pc-windows-msvc\release\bundle\nsis\Afumaturi_${version}_arm64-setup.exe"
        }
    }
    $destination = "${SshUser}@${Server}:${RemoteDirectory}/"
    $sshOptions = @(
        "-i", $SshKeyPath,
        "-o", "IdentitiesOnly=yes",
        "-o", "PasswordAuthentication=no",
        "-o", "BatchMode=yes",
        "-o", "StrictHostKeyChecking=yes",
        "-o", "ConnectTimeout=15",
        "-o", "ServerAliveInterval=15",
        "-o", "ServerAliveCountMax=3"
    )

    if (-not $SkipBuild) {
        if (-not $env:TAURI_SIGNING_PRIVATE_KEY) {
            $env:TAURI_SIGNING_PRIVATE_KEY = Get-Content $SigningKeyPath -Raw
        }
        Invoke-Checked "Instalare exacta dependente" { & npm.cmd ci }
    }

    $platforms = [ordered]@{}
    foreach ($entry in $artifacts.GetEnumerator()) {
        $artifactDefinition = $entry.Value
        if (-not $SkipBuild) {
            $buildScript = $artifactDefinition.Script
            Invoke-Checked $artifactDefinition.Description { & npm.cmd run $buildScript }
        }

        $installer = $artifactDefinition.Installer
        $signature = "$installer.sig"
        foreach ($artifactPath in @($installer, $signature)) {
            if (-not (Test-Path $artifactPath -PathType Leaf)) {
                throw "Artefactul lipseste: $artifactPath"
            }
        }

        $platforms[$entry.Key] = [ordered]@{
            signature = (Get-Content $signature -Raw).Trim()
            url = "$PublicBaseUrl/$([IO.Path]::GetFileName($installer))"
        }

        Invoke-Checked "Upload $($entry.Key) catre Contabo" {
            foreach ($uploadFile in @($installer, $signature)) {
                $fileInfo = Get-Item -LiteralPath $uploadFile
                Write-Host "Upload $($fileInfo.Name) ($([Math]::Round($fileInfo.Length / 1MB, 2)) MB)..."
                & scp.exe @sshOptions -- $uploadFile $destination
                if ($LASTEXITCODE -ne 0) {
                    throw "Upload esuat pentru $($fileInfo.Name) (cod $LASTEXITCODE)."
                }
                Write-Host "Upload finalizat: $($fileInfo.Name)" -ForegroundColor Green
            }
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

    Invoke-Checked "Upload manifest catre Contabo" {
        & scp.exe @sshOptions -- $manifestPath $destination
        if ($LASTEXITCODE -ne 0) {
            throw "Upload esuat pentru manifest (cod $LASTEXITCODE)."
        }
    }

    $remoteCommands = @(
        "cd '$RemoteDirectory'",
        "ln -sfn 'Afumaturi_${version}_x64-setup.exe' 'Afumaturi-Windows-x64-Setup.exe'",
        "ln -sfn 'Afumaturi_${version}_x86-setup.exe' 'Afumaturi-Windows-x86-Setup.exe'",
        "ln -sfn 'Afumaturi_${version}_arm64-setup.exe' 'Afumaturi-Windows-arm64-Setup.exe'",
        "mv 'latest.json.upload' 'latest.json'"
    ) -join " && "

    Invoke-Checked "Activare release pe Contabo" {
        & ssh.exe @sshOptions -- "${SshUser}@${Server}" $remoteCommands
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
