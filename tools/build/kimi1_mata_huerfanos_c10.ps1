$chrome = Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Select-Object ProcessId,ParentProcessId
$alive = @{}
Get-CimInstance Win32_Process -Filter "Name='node.exe'" | ForEach-Object { $alive[$_.ProcessId] = $true }
Get-CimInstance Win32_Process -Filter "Name='bash.exe'" | ForEach-Object { $alive[$_.ProcessId] = $true }
Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" | ForEach-Object { $alive[$_.ProcessId] = $true }
$matados = 0
foreach ($c in $chrome) {
  if (-not $alive.ContainsKey($c.ParentProcessId)) {
    Stop-Process -Id $c.ProcessId -Force -ErrorAction SilentlyContinue
    $matados++
  }
}
Write-Output ("matados: " + $matados)
