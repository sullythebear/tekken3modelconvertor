# Windows-only authored window fixture. Never a Tekken/gameplay test.
$ErrorActionPreference = 'Stop'
$folder = Join-Path ([IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))) ('artifacts\windows-capture-fixture-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force $folder | Out-Null
$exe = Join-Path $folder 'authored-window.exe'
Add-Type -TypeDefinition @'
using System;
using System.Drawing;
using System.Windows.Forms;
public class Fixture {
 [STAThread] public static void Main() {
  Form form=new Form(); form.Text="Authored capture fixture - NOT TEKKEN";
  form.Size=new Size(600,400); form.BackColor=Color.DarkBlue;
  Label label=new Label(); label.Text="Capture test"; label.ForeColor=Color.White;
  label.AutoSize=true; form.Controls.Add(label); form.KeyPreview=true;
  form.KeyDown+=(s,e)=>{label.Text="Received: "+e.KeyCode;};
  Application.Run(form);
 }
}
'@ -ReferencedAssemblies System.Windows.Forms,System.Drawing -OutputAssembly $exe -OutputType WindowsApplication
$request = Join-Path $folder 'request.json'
@{ executable=$exe; workingDirectory=$folder; arguments=@(); captureSeconds=4; actions=@(@{atSeconds=2;keys='a'}); output=(Join-Path $folder 'capture') } | ConvertTo-Json -Depth 5 | Set-Content $request
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'Capture-Game.ps1') -Request $request
if ($LASTEXITCODE -ne 0) { throw 'Authored window capture failed' }
$result = Get-Content (Join-Path $folder 'capture\capture.json') -Raw | ConvertFrom-Json
if ($result.frames.Count -lt 1 -or $result.events.Count -ne 1 -or $result.gameplayVerified -ne $false) { throw 'Capture report contents incorrect' }
Write-Host 'Authored Windows capture/input fixture passed; not a gameplay assertion.'
