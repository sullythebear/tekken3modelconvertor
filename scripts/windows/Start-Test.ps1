param([string]$Config, [switch]$Configure)
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
Set-Location $root
$local = Join-Path $root '.local'
New-Item -ItemType Directory -Force $local | Out-Null
if (!$Config) { $Config = Join-Path $local 'windows-test.json' }
$exitCode = 1
Start-Transcript -Path (Join-Path $local ('bootstrap-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.log')) | Out-Null
try {
  if (![Environment]::Is64BitOperatingSystem) { throw 'Windows x64 is required' }
  if (!(Test-Path $Config) -or $Configure) {
    Add-Type -AssemblyName System.Windows.Forms
    $folder = New-Object Windows.Forms.FolderBrowserDialog
    $folder.Description = 'Selecteer de uitgepakte Nikki-map met Nikki FN.fbx en 23 TGA-textures'
    if ($folder.ShowDialog() -ne 'OK') { throw 'Nikki-selectie geannuleerd' }
    $nikki = $folder.SelectedPath
    $file = New-Object Windows.Forms.OpenFileDialog
    $file.Title = 'Selecteer je originele USA ISO/BIN of donor-ZIP; Annuleren voor losse gamebestanden'
    $file.Filter = 'Game image / donor package|*.iso;*.bin;*.zip'
    $settings = @{ nikkiDirectory = $nikki; actions = @(); captureSeconds = 30 }
    if ($file.ShowDialog() -eq 'OK') {
      if ([IO.Path]::GetExtension($file.FileName) -eq '.zip') { $settings.donorPackage = $file.FileName }
      else { $settings.discImage = $file.FileName }
    } else {
      $folder.Description = 'Map met originele SLUS_004.02 en TEKKEN3.BNS'
      if ($folder.ShowDialog() -ne 'OK') { throw 'Game-selectie geannuleerd' }
      $settings.gameDirectory = $folder.SelectedPath
    }
    $settings | ConvertTo-Json -Depth 8 | Set-Content -Encoding UTF8 $Config
  }
  # A private portable runtime: no administrator rights or system PATH changes.
  $version = '24.10.0'
  $runtime = Join-Path $local "node-v$version-win-x64"
  $node = Join-Path $runtime 'node.exe'
  if (!(Test-Path $node)) {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $name = "node-v$version-win-x64.zip"
    $zip = Join-Path $local $name
    $base = "https://nodejs.org/dist/v$version"
    $checks = (Invoke-WebRequest -UseBasicParsing "$base/SHASUMS256.txt").Content
    $line = @($checks -split "`n" | Where-Object { $_.Trim().EndsWith("  $name") })
    if ($line.Count -ne 1) { throw 'Node SHA-256 metadata is missing or ambiguous' }
    Invoke-WebRequest -UseBasicParsing "$base/$name" -OutFile $zip
    $expected = ($line[0] -split '\s+')[0]
    if ((Get-FileHash $zip -Algorithm SHA256).Hash -ne $expected) { throw 'Node download SHA-256 mismatch' }
    $staging = Join-Path $local ('node-download-' + [guid]::NewGuid().ToString('N'))
    Expand-Archive -Path $zip -DestinationPath $staging
    if (Test-Path $runtime) { throw 'An incomplete private Node runtime exists; remove that folder and retry' }
    Move-Item (Join-Path $staging "node-v$version-win-x64") $runtime
    Remove-Item $staging
    Remove-Item $zip
  }
  $env:PATH = "$runtime;$env:PATH"
  $env:NODE_USE_ENV_PROXY = '1'
  $npm = Join-Path $runtime 'node_modules\npm\bin\npm-cli.js'
  & $node $npm ci --cache (Join-Path $local 'npm-cache') --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed; see bootstrap log' }
  # PowerShell 5 writes a UTF-8 BOM; the Node runner accepts it explicitly.
  & $node (Join-Path $root 'scripts\windows-test.mjs') $Config
  $exitCode = $LASTEXITCODE
  $latest = Get-Content (Join-Path $root 'artifacts\windows-local\latest.json') -Raw | ConvertFrom-Json
  Invoke-Item $latest.report
} catch {
  Write-Host $_ -ForegroundColor Red
  $failure = Join-Path $local 'bootstrap-failure.txt'
  $_ | Out-String | Set-Content $failure
  Write-Host "Bootstrapfout: $failure"
  $message = [Net.WebUtility]::HtmlEncode(($_ | Out-String))
  $failureHtml = Join-Path $local 'bootstrap-failure.html'
  "<!doctype html><meta charset='utf-8'><title>FAIL - Windows bootstrap</title><h1>FAIL</h1><p>De testomgeving kon niet worden gestart. Geen gameplay getest.</p><pre>$message</pre><p>Zie de bootstrap-log in .local.</p>" | Set-Content -Encoding UTF8 $failureHtml
  Invoke-Item $failureHtml
} finally { Stop-Transcript | Out-Null }
exit $exitCode
