param(
    [string]$Server = "169.58.28.222",
    [string]$SshUser = "afumaturi",
    [string]$RemoteDirectory = "/var/www/afumaturi-updates",
    [string]$PublicBaseUrl = "https://afumaturi-api.duckdns.org/updates",
    [string]$SshKeyPath = "$env:USERPROFILE\.ssh\afumaturi_contabo",
    [string]$KeystorePath = "$env:USERPROFILE\.tauri\afumaturi-android.jks",
    [string]$KeyAlias = "afumaturi",
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

foreach ($command in @("git.exe", "npm.cmd", "scp.exe", "ssh.exe")) {
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

foreach ($file in @($SshKeyPath, $KeystorePath)) {
    if (-not (Test-Path $file -PathType Leaf)) {
        throw "Fisierul necesar nu exista: $file"
    }
}

if (-not $env:ANDROID_HOME -or -not (Test-Path $env:ANDROID_HOME -PathType Container)) {
    throw "ANDROID_HOME nu este configurat corect."
}

$buildTools = Get-ChildItem "$env:ANDROID_HOME\build-tools" -Directory |
    Where-Object Name -Match '^\d+\.\d+\.\d+' |
    Sort-Object { [Version]($_.Name -replace '^([0-9]+\.[0-9]+\.[0-9]+).*$', '$1') } |
    Select-Object -Last 1
if (-not $buildTools) {
    throw "Android SDK Build-Tools nu a fost gasit."
}

$zipAlign = Join-Path $buildTools.FullName "zipalign.exe"
$apkSigner = Join-Path $buildTools.FullName "apksigner.bat"
foreach ($tool in @($zipAlign, $apkSigner)) {
    if (-not (Test-Path $tool -PathType Leaf)) {
        throw "Instrumentul Android lipseste: $tool"
    }
}

$package = Get-Content "$projectRoot\package.json" -Raw | ConvertFrom-Json
$version = [string]$package.version
$tauriConfig = Get-Content "$projectRoot\src-tauri\tauri.conf.json" -Raw | ConvertFrom-Json
if ([string]$tauriConfig.version -ne $version) {
    throw "Versiunile package.json ($version) si tauri.conf.json ($($tauriConfig.version)) nu coincid."
}

$unsignedApk = "$projectRoot\src-tauri\gen\android\app\build\outputs\apk\universal\release\app-universal-release-unsigned.apk"
$releaseFileName = "Afumaturi_${version}_android-universal.apk"
$temporaryDirectory = Join-Path ([IO.Path]::GetTempPath()) "afumaturi-android-release-$([Guid]::NewGuid())"
$alignedApk = Join-Path $temporaryDirectory "aligned.apk"
$signedApk = Join-Path $temporaryDirectory $releaseFileName
$manifestPath = Join-Path $temporaryDirectory "android-latest.json.upload"
$passwordPointer = [IntPtr]::Zero

Write-Host "Release Afumaturi Android $version" -ForegroundColor Green
Write-Host "Destinatie: ${SshUser}@${Server}:${RemoteDirectory}"

try {
    if (-not $SkipBuild) {
        Invoke-Checked "Instalare exacta dependente" { & npm.cmd ci }
        Invoke-Checked "Build APK universal Android" { & npm.cmd run tauri:android:build -- --apk }
    }

    if (-not (Test-Path $unsignedApk -PathType Leaf)) {
        throw "APK-ul nesemnat lipseste: $unsignedApk"
    }

    New-Item -ItemType Directory -Path $temporaryDirectory | Out-Null
    Invoke-Checked "Aliniere APK" { & $zipAlign -p -f 4 $unsignedApk $alignedApk }

    $securePassword = Read-Host "Parola keystore Android" -AsSecureString
    $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    $env:AFUMATURI_ANDROID_KEY_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)

    Invoke-Checked "Semnare APK" {
        & $apkSigner sign --ks $KeystorePath --ks-key-alias $KeyAlias --ks-pass env:AFUMATURI_ANDROID_KEY_PASSWORD --key-pass env:AFUMATURI_ANDROID_KEY_PASSWORD --out $signedApk $alignedApk
    }
    Invoke-Checked "Verificare semnatura APK" { & $apkSigner verify --verbose $signedApk }

    $sha256 = (Get-FileHash $signedApk -Algorithm SHA256).Hash.ToLowerInvariant()
    $manifest = [ordered]@{
        version = $version
        pub_date = [DateTime]::UtcNow.ToString("o")
        url = "$PublicBaseUrl/$releaseFileName"
        sha256 = $sha256
        minimum_android = "7.0"
    }
    $manifestJson = $manifest | ConvertTo-Json -Depth 4
    [IO.File]::WriteAllText($manifestPath, $manifestJson, [Text.UTF8Encoding]::new($false))

    $destination = "${SshUser}@${Server}:${RemoteDirectory}/"
    Invoke-Checked "Upload APK catre Contabo" {
        & scp.exe -i $SshKeyPath -o IdentitiesOnly=yes -o PasswordAuthentication=no $signedApk $manifestPath $destination
    }

    $remoteCommands = @(
        "cd '$RemoteDirectory'",
        "ln -sfn '$releaseFileName' 'Afumaturi-Android.apk'",
        "mv 'android-latest.json.upload' 'android-latest.json'"
    ) -join " && "
    Invoke-Checked "Activare release Android pe Contabo" {
        & ssh.exe -i $SshKeyPath -o IdentitiesOnly=yes -o PasswordAuthentication=no "${SshUser}@${Server}" $remoteCommands
    }

    Write-Host "`nRelease Android $version publicat cu succes." -ForegroundColor Green
    Write-Host "$PublicBaseUrl/Afumaturi-Android.apk"
}
finally {
    if ($passwordPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    }
    Remove-Item Env:AFUMATURI_ANDROID_KEY_PASSWORD -ErrorAction SilentlyContinue
    if (Test-Path $temporaryDirectory) {
        Remove-Item $temporaryDirectory -Recurse -Force
    }
}
