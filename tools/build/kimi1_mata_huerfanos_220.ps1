$procs = Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object { $_.CommandLine -match 'user-data-dir=.*Temp.*kimi' -and $_.CommandLine -match 'headless' }
$aliveParents = @{}
$roots = @()
foreach ($p in $procs) {
  $ppid = $p.ParentProcessId
  if (-not $aliveParents.ContainsKey($ppid)) {
    $parent = Get-CimInstance Win32_Process -Filter "ProcessId=$ppid" -ErrorAction SilentlyContinue
    $aliveParents[$ppid] = [bool]$parent
  }
  if (-not $aliveParents[$ppid]) { $roots += $p.ProcessId }
}
Write-Output ("headless-kimi=" + $procs.Count + " roots-huerfanos=" + ($roots -join ','))
foreach ($r in $roots) { taskkill /F /T /PID $r | Out-Null }
Write-Output "OK"