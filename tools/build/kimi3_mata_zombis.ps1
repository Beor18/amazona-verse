$z = Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object { $_.CommandLine -match '--headless' -and $_.CommandLine -match 'Temp.kimi' }
Write-Output ('zombis: ' + $z.Count)
$z | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 2
$rest = (Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object { $_.CommandLine -match '--headless' -and $_.CommandLine -match 'Temp.kimi' }).Count
Write-Output ('quedan: ' + $rest)
