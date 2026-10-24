param([Parameter(Mandatory=$true)][string]$Request)
$ErrorActionPreference = 'Stop'
$r = Get-Content $Request -Raw | ConvertFrom-Json
if ($r.captureSeconds -lt 1 -or $r.captureSeconds -gt 180) { throw 'Capture duration must be 1..180 seconds' }
if (@($r.actions).Count -gt 60) { throw 'At most 60 input actions per run' }
foreach ($a in $r.actions) {
  if ($a.atSeconds -lt 0 -or $a.atSeconds -gt $r.captureSeconds -or $a.keys -notmatch '^(\{(ENTER|UP|DOWN|LEFT|RIGHT|SPACE|TAB)\}|[a-zA-Z0-9])$') { throw 'Unsafe/invalid action; only single game keys allowed' }
}
New-Item -ItemType Directory -Force $r.output | Out-Null
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class T3CSWindow {
 [StructLayout(LayoutKind.Sequential)] public struct Rect { public int Left,Top,Right,Bottom; }
 [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
 [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h,out Rect r);
}
'@
# Use ProcessStartInfo with explicit Windows argument quoting; never invoke a shell.
function Quote-Argument([string]$s) {
  return '"' + [regex]::Replace([regex]::Replace($s, '(\\*)"', '$1$1\"'), '(\\+)$', '$1$1') + '"'
}
$psi = New-Object Diagnostics.ProcessStartInfo
$psi.FileName = $r.executable
$psi.WorkingDirectory = $r.workingDirectory
$psi.Arguments = (@($r.arguments | ForEach-Object { Quote-Argument $_ }) -join ' ')
$psi.UseShellExecute = $false
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$process = New-Object Diagnostics.Process
$process.StartInfo = $psi
$events = @(); $frames = @(); $failed = $false; $started = Get-Date; $launched = $false
try {
  if (!$process.Start()) { throw 'Game process did not start' }
  $launched = $true
  $stdout = $process.StandardOutput.ReadToEndAsync(); $stderr = $process.StandardError.ReadToEndAsync()
  $pending = @($r.actions | Sort-Object atSeconds)
  for ($tick = 0; $tick -lt $r.captureSeconds; $tick++) {
    Start-Sleep -Seconds 1
    $process.Refresh()
    if ($process.HasExited) { throw "Game process exited during capture: $($process.ExitCode)" }
    $handle = $process.MainWindowHandle
    if ($handle -eq [IntPtr]::Zero) { continue }
    while ($pending.Count -gt 0 -and $pending[0].atSeconds -le $tick + 1) {
      [T3CSWindow]::SetForegroundWindow($handle) | Out-Null
      Start-Sleep -Milliseconds 100
      if ([T3CSWindow]::GetForegroundWindow() -ne $handle) { throw 'Input stopped: game window does not own focus' }
      [Windows.Forms.SendKeys]::SendWait($pending[0].keys)
      $events += @{ seconds = $tick + 1; keys = $pending[0].keys; focusVerified = $true }
      $pending = @($pending | Select-Object -Skip 1)
    }
    if ([T3CSWindow]::GetForegroundWindow() -ne $handle) {
      [T3CSWindow]::SetForegroundWindow($handle) | Out-Null
      Start-Sleep -Milliseconds 100
    }
    if ([T3CSWindow]::GetForegroundWindow() -ne $handle) { continue }
    $rect = New-Object T3CSWindow+Rect
    if (![T3CSWindow]::GetWindowRect($handle,[ref]$rect)) { continue }
    $width = $rect.Right - $rect.Left; $height = $rect.Bottom - $rect.Top
    if ($width -lt 16 -or $height -lt 16 -or $width -gt 7680 -or $height -gt 4320) { continue }
    $bitmap = New-Object Drawing.Bitmap($width,$height)
    $graphics = [Drawing.Graphics]::FromImage($bitmap)
    try {
      $graphics.CopyFromScreen($rect.Left,$rect.Top,0,0,$bitmap.Size)
      $name = 'frame-{0:D3}.png' -f $tick
      $bitmap.Save((Join-Path $r.output $name),[Drawing.Imaging.ImageFormat]::Png)
      $frames += $name
    } finally { $graphics.Dispose(); $bitmap.Dispose() }
  }
  if (!$frames.Count) { throw 'No visible game frames captured; child-process launchers are not supported' }
  if ($pending.Count) { throw 'Some requested input actions were not executed' }
} catch { $failed = $true; $events += @{ error = $_.ToString() } }
finally {
  # Stop only the process created by this run, never an existing emulator session.
  if ($launched -and !$process.HasExited) { $process.Kill(); $process.WaitForExit(5000) | Out-Null }
  if ($stdout) { $stdout.Wait(5000) | Out-Null }
  if ($stderr) { $stderr.Wait(5000) | Out-Null }
  if ($stdout -and $stdout.IsCompleted) { $stdout.Result | Set-Content (Join-Path $r.output 'stdout.log') }
  if ($stderr -and $stderr.IsCompleted) { $stderr.Result | Set-Content (Join-Path $r.output 'stderr.log') }
  # Read only matching recent Windows crash events; do not change global WER settings.
  try {
    $leaf = [IO.Path]::GetFileName($r.executable)
    $crashes = @(Get-WinEvent -FilterHashtable @{LogName='Application'; StartTime=$started; Id=1000,1001} -ErrorAction Stop | Where-Object { $_.Message -like "*$leaf*" } | Select-Object TimeCreated,Id,Message)
    $crashes | ConvertTo-Json -Depth 4 | Set-Content (Join-Path $r.output 'crash-events.json')
    if ($crashes.Count) { $failed = $true }
  } catch { 'Windows event log unavailable or no matching events' | Set-Content (Join-Path $r.output 'crash-event-note.txt') }
  @{ schema='t3cs-runtime-capture/1'; status=$(if($failed){'FAIL'}else{'PASS'}); frames=$frames; events=$events; stoppedByRunner=$true; gameplayVerified=$false; note='Foreground screen capture can include occlusion; screenshots need human review. Process survival is not animation correctness.' } | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $r.output 'capture.json')
}
if ($failed) { exit 1 }
exit 0
