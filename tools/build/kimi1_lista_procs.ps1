Get-CimInstance Win32_Process |
  Where-Object { $_.Name -match 'chrome|node' } |
  ForEach-Object {
    $cmd = $_.CommandLine
    if ($null -eq $cmd) { $cmd = '' }
    if ($cmd.Length -gt 110) { $cmd = $cmd.Substring(0, 110) }
    "{0} parent={1} {2} :: {3}" -f $_.ProcessId, $_.ParentProcessId, $_.Name, $cmd
  }
