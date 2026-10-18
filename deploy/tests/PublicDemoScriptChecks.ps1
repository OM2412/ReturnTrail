# Controlled fixtures: no Docker engine, public tunnel or external HTTP is used.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$script = Join-Path $repo 'Start-PublicDemo.ps1'
$results = @()
$fixtureRoot = Join-Path ([IO.Path]::GetTempPath()) ('returntrail-script-check-' + [guid]::NewGuid().ToString('N'))
$null = New-Item -ItemType Directory -Path $fixtureRoot
$originalLocation = (Get-Location).Path
$savedOrigin = [Environment]::GetEnvironmentVariable('RETURNTRAIL_DEMO_ORIGIN')
$savedKey = [Environment]::GetEnvironmentVariable('GROQ_API_KEY')
$savedTls = [Net.ServicePointManager]::SecurityProtocol
try {
    foreach ($case in @('success', 'skip-build', 'stderr-logs', 'docker-offline', 'wrong-os', 'build-fails', 'app-fails', 'wrong-public-app')) {
        $caseRoot = Join-Path $fixtureRoot $case
        $null = New-Item -ItemType Directory -Path $caseRoot
        Copy-Item -LiteralPath (Join-Path $repo 'compose.public-demo.yaml') -Destination $caseRoot
        $global:demoFixtureCase = $case
        $global:demoFixtureCalls = New-Object 'System.Collections.Generic.List[string]'
        $global:demoFixtureHttp = New-Object 'System.Collections.Generic.List[string]'
        function global:docker {
            param([Parameter(ValueFromRemainingArguments = $true)][string[]]$FixtureArgs)
            $global:LASTEXITCODE = 0
            $line = $FixtureArgs -join '|'
            $global:demoFixtureCalls.Add($line)
            if ($FixtureArgs[0] -eq 'info') {
                if ($global:demoFixtureCase -eq 'docker-offline') { $global:LASTEXITCODE = 1; return }
                if ($global:demoFixtureCase -eq 'wrong-os') { return 'windows' }
                return 'linux'
            }
            if ($line -match '^compose\|version$') { return 'Docker Compose fixture' }
            if ($FixtureArgs[0] -eq 'image') { return 'sha256:fixture' }
            if ($FixtureArgs[0] -eq 'inspect') { return '2026-10-18T00:00:00Z' }
            if ($FixtureArgs -contains 'ps') { return 'fixture-container-id' }
            if ($FixtureArgs -contains 'logs') {
                if ($FixtureArgs -notcontains '--since') { throw 'Logs were not scoped to the current tunnel process' }
                if ($global:demoFixtureCase -eq 'stderr-logs') { Write-Error 'Tunnel URL https://fixture-public-demo.trycloudflare.com'; return }
                return 'Tunnel URL https://fixture-public-demo.trycloudflare.com'
            }
            if (($global:demoFixtureCase -eq 'build-fails' -and $FixtureArgs -contains 'build') -or
                ($global:demoFixtureCase -eq 'app-fails' -and $FixtureArgs -contains '--no-build')) {
                $global:LASTEXITCODE = 1
            }
        }
        function global:Invoke-RestMethod {
            param($Uri, $TimeoutSec, $ErrorAction)
            $global:demoFixtureHttp.Add($Uri)
            return [pscustomobject]@{ status = 'UP' }
        }
        function global:Invoke-WebRequest {
            param([switch]$UseBasicParsing, $Uri, $TimeoutSec, $ErrorAction)
            if ($global:demoFixtureCase -eq 'wrong-public-app') { return [pscustomobject]@{ Content = 'unrelated app' } }
            return [pscustomobject]@{ Content = '<div id="root"></div>' }
        }
        $env:RETURNTRAIL_DEMO_ORIGIN = 'https://existing-origin.example.invalid'
        $env:GROQ_API_KEY = 'fixture-secret-never-print'
        $statusPath = Join-Path $caseRoot 'status.json'
        $failed = $false
        $failureMessage = ''
        $output = @()
        try {
            if ($case -eq 'skip-build') { $output = @(& $script -ProjectRoot $caseRoot -StatusPath $statusPath -SkipBuild 6>&1) }
            else { $output = @(& $script -ProjectRoot $caseRoot -StatusPath $statusPath 6>&1) }
        } catch { $failed = $true; $failureMessage = $_.Exception.Message }
        $expectedFailure = $case -in @('docker-offline', 'wrong-os', 'build-fails', 'app-fails', 'wrong-public-app')
        if ($failed -ne $expectedFailure) { throw "Unexpected success/failure for ${case}: $failureMessage" }
        if ($env:RETURNTRAIL_DEMO_ORIGIN -ne 'https://existing-origin.example.invalid') { throw 'Origin environment changed' }
        if ($env:GROQ_API_KEY -ne 'fixture-secret-never-print') { throw 'Model environment changed' }
        if ([Net.ServicePointManager]::SecurityProtocol -ne $savedTls) { throw 'TLS process setting changed' }
        if ((Get-Location).Path -ne $originalLocation) { throw 'Working location changed' }
        $allCalls = $global:demoFixtureCalls -join "`n"
        if ($allCalls -match 'fixture-secret-never-print|down|--volumes') { throw 'Unexpected secret or destructive Docker operation' }
        if (($output | Out-String) -match 'fixture-secret-never-print') { throw 'Secret appeared in output' }
        if (-not $failed) {
            $state = Get-Content -LiteralPath $statusPath -Raw | ConvertFrom-Json
            if ($state.publicUrl -ne 'https://fixture-public-demo.trycloudflare.com') { throw 'Wrong URL saved' }
            if ($state.mode -ne 'TEMPORARY_GUEST_PREVIEW') { throw 'Wrong mode saved' }
            if (-not ($global:demoFixtureHttp -contains 'https://fixture-public-demo.trycloudflare.com/actuator/health/readiness')) { throw 'Public readiness was skipped' }
            if ($case -eq 'skip-build' -and $allCalls -match '\|build\|app') { throw 'SkipBuild performed a build' }
        } elseif (Test-Path -LiteralPath $statusPath) { throw 'Failure wrote success state' }
        if ($case -in @('app-fails','wrong-public-app')) {
            if ($allCalls -notmatch '\|stop\|tunnel') { throw 'Failed public startup did not stop its tunnel' }
        } elseif ($expectedFailure -and $allCalls -match '\|stop\|tunnel') { throw 'Preflight stopped an existing tunnel' }
        $results += $case
        Write-Host "PASS $case"
    }
    Write-Host "$($results.Count) controlled public-demo script checks passed."
} finally {
    foreach ($name in @('docker','Invoke-RestMethod','Invoke-WebRequest')) { Remove-Item "Function:global:$name" -ErrorAction SilentlyContinue }
    if ($null -eq $savedOrigin) { Remove-Item Env:RETURNTRAIL_DEMO_ORIGIN -ErrorAction SilentlyContinue } else { $env:RETURNTRAIL_DEMO_ORIGIN = $savedOrigin }
    if ($null -eq $savedKey) { Remove-Item Env:GROQ_API_KEY -ErrorAction SilentlyContinue } else { $env:GROQ_API_KEY = $savedKey }
    [Net.ServicePointManager]::SecurityProtocol = $savedTls
    Set-Location $originalLocation
    Remove-Item -LiteralPath $fixtureRoot -Recurse -Force
}
