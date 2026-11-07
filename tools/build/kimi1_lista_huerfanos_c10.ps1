$chrome = Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Select-Object ProcessId,ParentProcessId
$alive = @{}
Get-CimInstance Win32_Process -Filter "Name='node.exe'" | ForEach-Object { $alive[$_.ProcessId] = $true }
Get-CimInstance Win32_Process -Filter "Name='bash.exe'" | ForEach-Object { $alive[$_.ProcessId] = $true }
Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" | ForEach-Object { $alive[$_.ProcessId] = $true }
foreach ($c in $chrome) {
  $a = $alive.ContainsKey($c.ParentProcessId)
  $estado = if ($a) { "VIVO" } else { "HUERFANO" }
  Write-Output ("chrome " + $c.ProcessId + " padre " + $c.ParentProcessId + " " + $estado)
}
