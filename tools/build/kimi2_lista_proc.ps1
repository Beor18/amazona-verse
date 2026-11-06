$cs = Get-CimInstance Win32_Process -Filter "Name='chrome.exe'"
Write-Output ('total: ' + ($cs | Measure-Object).Count)
$cs | Group-Object { if ($_.CommandLine -match 'user-data-dir=.?([^\" ]+)') { $Matches[1] } else { 'sin-dir' } } | Select-Object Name, Count | Format-Table -AutoSize
$main = $cs | Where-Object { $_.CommandLine -notlike '*--type=*' }
foreach ($m in $main) {
  $ppid = $m.ParentProcessId
  $p = Get-CimInstance Win32_Process -Filter "ProcessId=$ppid" -ErrorAction SilentlyContinue
  Write-Output ('main ' + $m.ProcessId + ' padre=' + $ppid + ' ' + $(if ($p) { $p.Name } else { 'MUERTO' }))
}
