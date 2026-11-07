$chrome = Get-CimInstance Win32_Process -Filter "Name='chrome.exe'"
$grupos = $chrome | Group-Object ParentProcessId | Sort-Object Count -Descending
foreach ($g in $grupos) {
  $ppid = $g.Name
  $vivo = $false
  $cmdP = ''
  $p = Get-Process -Id $ppid -ErrorAction SilentlyContinue
  if ($p) { $vivo = $true }
  $pp = Get-CimInstance Win32_Process -Filter "ProcessId=$ppid" -ErrorAction SilentlyContinue
  if ($pp) { $cmdP = $pp.CommandLine }
  if (-not $cmdP) { $cmdP = '(sin padre en WMI)' }
  if ($cmdP.Length -gt 130) { $cmdP = $cmdP.Substring(0,130) }
  $hijos = ($chrome | Where-Object { $_.ParentProcessId -eq $ppid } | Select-Object -First 1).CommandLine
  $hijoCorto = ''
  if ($hijos) { $hijoCorto = $hijos; if ($hijoCorto.Length -gt 110) { $hijoCorto = $hijoCorto.Substring(0,110) } }
  Write-Output ("PPID={0} N={1} PadreVivo={2}" -f $ppid, $g.Count, $vivo)
  Write-Output ("  padre: " + $cmdP)
  Write-Output ("  hijo : " + $hijoCorto)
}
Write-Output ("TOTAL chrome: " + ($chrome | Measure-Object).Count)
