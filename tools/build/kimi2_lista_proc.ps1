foreach ($per in 'kimi1k174d-8NzYZI', 'kimi3m171-snlt6X') {
  $main = Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object { $_.CommandLine -like "*$per*" -and $_.CommandLine -notlike '*--type=*' } | Select-Object -First 1
  if ($main) {
    $ppid = $main.ParentProcessId
    $pproc = Get-CimInstance Win32_Process -Filter "ProcessId=$ppid" -ErrorAction SilentlyContinue
    if ($pproc) {
      $c = $pproc.Name + ' :: ' + $pproc.CommandLine
      if ($c.Length -gt 140) { $c = $c.Substring(0, 140) }
      Write-Output ("$per main=" + $main.ProcessId + " padre=$ppid => " + $c)
    } else { Write-Output ("$per main=" + $main.ProcessId + " padre=$ppid => MUERTO") }
  }
}
