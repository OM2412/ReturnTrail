[CmdletBinding()]
param(
    [string]$ProjectRoot = $PSScriptRoot,
    [switch]$SkipBuild,
    [string]$StatusPath = ''
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Invoke-Docker {
    param([string[]]$DockerArgs)
    & docker @DockerArgs
    if ($LASTEXITCODE -ne 0) { throw "Docker command failed ($($DockerArgs[0])). Inspect the output above." }
}
function Read-Docker {
    param([string[]]$DockerArgs)
    # Windows PowerShell 5 can wrap native stderr logs in ErrorRecord objects.
    # Capture them as text without treating successful docker logs as a failure.
    $savedPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $lines = @(& docker @DockerArgs 2>&1)
        $exitCode = $LASTEXITCODE
        if ($exitCode -ne 0) { throw "Docker query failed ($($DockerArgs[0]))." }
        return (($lines | ForEach-Object { $_.ToString() }) -join "`n").Trim()
    } finally { $ErrorActionPreference = $savedPreference }
}
function Wait-DemoHealth {
    param([string]$Origin, [int]$Seconds)
    $timer = [Diagnostics.Stopwatch]::StartNew()
    while ($timer.Elapsed.TotalSeconds -lt $Seconds) {
        try {
            $health = Invoke-RestMethod -Uri "$Origin/actuator/health/readiness" -TimeoutSec 6 -ErrorAction Stop
            if ($health.status -eq 'UP') { return }
        } catch { }
        Start-Sleep -Seconds 2
    }
    throw "The app did not become ready at $Origin. Check Docker, internet access and demo container logs."
}

$originalLocation = Get-Location
$originalOrigin = [Environment]::GetEnvironmentVariable('RETURNTRAIL_DEMO_ORIGIN')
$originalTls = [Net.ServicePointManager]::SecurityProtocol
$emptyEnv = $null
$compose = @()
$tunnelTouched = $false
try {
    Set-Location -LiteralPath $ProjectRoot
    $ProjectRoot = (Get-Location).Path
    $null = Get-Command docker -ErrorAction Stop
    if (-not (Test-Path -LiteralPath (Join-Path $ProjectRoot 'compose.public-demo.yaml'))) {
        throw 'compose.public-demo.yaml is missing. Pull the current repository first.'
    }
    $dockerOs = Read-Docker @('info', '--format', '{{.OSType}}')
    if ($dockerOs -ne 'linux') { throw 'Start Docker Desktop with Linux containers, then retry.' }
    $null = Read-Docker @('compose', 'version')
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    # Prevent an existing production .env from being loaded into this demo.
    $emptyEnv = [IO.Path]::GetTempFileName()
    $compose = @('compose', '--project-name', 'returntrail-public-demo', '--env-file', $emptyEnv,
        '-f', (Join-Path $ProjectRoot 'compose.public-demo.yaml'))
    $env:RETURNTRAIL_DEMO_ORIGIN = ''
    if ($SkipBuild) {
        $null = Read-Docker @('image', 'inspect', 'returntrail-public-demo-app:local', '--format', '{{.Id}}')
    } else {
        Write-Host 'Building the combined frontend/backend image. The first build can take several minutes.'
        Invoke-Docker ($compose + @('build', 'app'))
    }
    Invoke-Docker ($compose + @('up', '-d', 'falkordb', 'tunnel'))
    $tunnelTouched = $true
    $tunnelId = Read-Docker ($compose + @('ps', '--all', '--quiet', 'tunnel'))
    if (-not $tunnelId) { throw 'The tunnel container could not be inspected.' }
    $tunnelStartedAt = Read-Docker @('inspect', '--format', '{{.State.StartedAt}}', $tunnelId)
    if (-not $tunnelStartedAt) { throw 'The tunnel start time could not be inspected.' }
    $origin = $null
    $timer = [Diagnostics.Stopwatch]::StartNew()
    while ($timer.Elapsed.TotalSeconds -lt 90) {
        # Ignore URLs printed by an older process in this reused container.
        $logs = Read-Docker ($compose + @('logs', '--no-color', '--since', $tunnelStartedAt, '--tail', '150', 'tunnel'))
        $urls = [regex]::Matches($logs, 'https://[a-z0-9]+(?:-[a-z0-9]+)*\.trycloudflare\.com')
        if ($urls.Count -gt 0) { $origin = $urls[$urls.Count - 1].Value; break }
        Start-Sleep -Seconds 2
    }
    if (-not $origin) { throw 'Cloudflare did not allocate a public URL. Check internet access and tunnel logs.' }
    $env:RETURNTRAIL_DEMO_ORIGIN = $origin
    Invoke-Docker ($compose + @('up', '-d', '--no-build', 'app'))
    Wait-DemoHealth 'http://127.0.0.1:18085' 120
    Wait-DemoHealth $origin 120
    $pageResponse = Invoke-WebRequest -UseBasicParsing -Uri "$origin/" -TimeoutSec 15 -ErrorAction Stop
    if ($pageResponse.Content -notmatch 'id="root"') { throw 'The public URL did not return the ReturnTrail frontend.' }
    if (-not $StatusPath) {
        $stateBase = [Environment]::GetFolderPath('LocalApplicationData')
        if (-not $stateBase) { $stateBase = [IO.Path]::GetTempPath() }
        $StatusPath = Join-Path $stateBase 'ReturnTrail/public-demo/status.json'
    }
    $StatusPath = [IO.Path]::GetFullPath($StatusPath)
    $null = New-Item -ItemType Directory -Path (Split-Path -Parent $StatusPath) -Force
    [pscustomobject]@{
        publicUrl = $origin
        startedAtUtc = [DateTime]::UtcNow.ToString('o')
        mode = 'TEMPORARY_GUEST_PREVIEW'
        project = 'returntrail-public-demo'
    } | ConvertTo-Json | Set-Content -LiteralPath $StatusPath -Encoding UTF8
    Write-Host "`nPUBLIC DEMO: $origin" -ForegroundColor Green
    Write-Host "Status saved: $StatusPath"
    Write-Host 'Keep this laptop awake, online and Docker Desktop running. Containers run in the background.'
    Write-Host 'This temporary guest preview uses a separate local graph volume. It has no uptime guarantee.'
    Write-Host 'Google/GitHub sign-in is disabled on this changing demo hostname. Guest workflows are available.'
    Write-Host 'Stop the public preview (data volume retained):'
    Write-Host 'docker compose --project-name returntrail-public-demo -f compose.public-demo.yaml stop'
} catch {
    if ($tunnelTouched) {
        try { Invoke-Docker ($compose + @('stop', 'tunnel')) } catch { Write-Warning 'Could not stop the tunnel automatically; stop it in Docker Desktop.' }
    }
    throw
} finally {
    if ($null -eq $originalOrigin) { Remove-Item Env:RETURNTRAIL_DEMO_ORIGIN -ErrorAction SilentlyContinue }
    else { $env:RETURNTRAIL_DEMO_ORIGIN = $originalOrigin }
    [Net.ServicePointManager]::SecurityProtocol = $originalTls
    if ($emptyEnv) { Remove-Item -LiteralPath $emptyEnv -ErrorAction SilentlyContinue }
    Set-Location $originalLocation
}
