$n = @(Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -match 'kimi' })
$c = @(Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object { $_.CommandLine -match 'kimi' })
Write-Output ("node-kimi: " + $n.Count + " chrome-kimi: " + $c.Count)
foreach ($p in $n) {
  $cmd = $p.CommandLine -replace '\s+', ' '
  if ($cmd.Length -gt 140) { $cmd = $cmd.Substring(0, 140) }
  Write-Output ("  node " + $p.ProcessId + " :: " + $cmd)
}
$grupos = @{}
foreach ($p in $c) { $k = $p.ParentProcessId; if (-not $grupos.ContainsKey($k)) { $grupos[$k] = 0 }; $grupos[$k]++ }
foreach ($k in $grupos.Keys) {
  $padre = Get-CimInstance Win32_Process -Filter ("ProcessId=" + $k) -ErrorAction SilentlyContinue
  $vivo = ($null -ne $padre)
  $pcmd = ""
  if ($vivo) { $pcmd = $padre.CommandLine -replace '\s+', ' '; if ($pcmd.Length -gt 100) { $pcmd = $pcmd.Substring(0, 100) } }
  Write-Output ("  chrome padre=" + $k + " n=" + $grupos[$k] + " vivo=" + $vivo + " :: " + $pcmd)
}
