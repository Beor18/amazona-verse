$ps = Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object { $_.CommandLine -like '*kimi*' }
$mios = @()
foreach ($p in $ps) {
  $padre = $null
  try { $padre = Get-Process -Id $p.ParentProcessId -ErrorAction Stop } catch {}
  if (-not $padre) { $mios += $p.ProcessId }
}
Write-Output ("chrome kimi total: " + $ps.Count + " | raices huerfanas: " + $mios.Count)
foreach ($id in $mios) { & taskkill /F /T /PID $id 2>&1 | Out-Null }
Start-Sleep 2
$rest = Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object { $_.CommandLine -like '*kimi*' }
Write-Output ("quedan chrome kimi: " + ($rest | Measure-Object).Count)
$nodos = Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -like '*kimi*' }
Write-Output ("node kimi vivos: " + ($nodos | Measure-Object).Count)
