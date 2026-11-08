$ids = 20928,46708,55652,14112,33756,12416,33820,58608,52460
foreach ($id in $ids) {
  $p = Get-CimInstance Win32_Process -Filter "ProcessId=$id" -ErrorAction SilentlyContinue
  if ($p) {
    $pp = Get-CimInstance Win32_Process -Filter "ProcessId=$($p.ParentProcessId)" -ErrorAction SilentlyContinue
    $pn = 'MUERTO'
    if ($pp) { $pn = $pp.Name + ' ' + $pp.ProcessId }
    $cmd = $p.CommandLine
    if ($null -eq $cmd) { $cmd = '' }
    if ($cmd.Length -gt 140) { $cmd = $cmd.Substring(0,140) }
    Write-Output ($id.ToString() + ' = ' + $p.Name + ' parent=' + $p.ParentProcessId + ' (' + $pn + ') cmd=' + $cmd)
  } else {
    Write-Output ($id.ToString() + ' = MUERTO')
  }
}
