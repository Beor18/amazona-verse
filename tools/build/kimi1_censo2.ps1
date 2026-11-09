$procs = Get-CimInstance Win32_Process -Filter "Name='node.exe' OR Name='chrome.exe'"
foreach ($p in $procs) {
  $pp = Get-CimInstance Win32_Process -Filter ("ProcessId=" + $p.ParentProcessId) -ErrorAction SilentlyContinue
  $pn = "MUERTO"
  if ($pp) { $pn = [string]$pp.Name + " " + [string]$pp.ProcessId }
  $cmd = [string]$p.CommandLine
  if ($null -eq $cmd) { $cmd = "" }
  if ($cmd.Length -gt 150) { $cmd = $cmd.Substring(0, 150) }
  $line = ([string]$p.ProcessId + " " + $p.Name + " parent=" + [string]$p.ParentProcessId + " (" + $pn + ") " + $cmd)
  Write-Output $line
}
