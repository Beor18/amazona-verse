$z = Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object { $_.CommandLine -match '--headless' -and $_.CommandLine -match 'Temp[\\/]kimi3' }
Write-Output ('mis zombis kimi3: ' + $z.Count)
$z | ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop; Write-Output ('matado ' + $_.ProcessId) } catch {} }
Start-Sleep -Seconds 2
$rest = (Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object { $_.CommandLine -match '--headless' -and $_.CommandLine -match 'Temp[\\/]kimi3' }).Count
Write-Output ('quedan mios: ' + $rest)
