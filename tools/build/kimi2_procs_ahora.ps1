Get-CimInstance Win32_Process -Filter "Name='node.exe'" | ForEach-Object { "NODE PID $($_.ProcessId): $($_.CommandLine)" }
"--- chrome (solo los que llevan perfil kimi o headless) ---"
Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object { $_.CommandLine -match 'kimi|headless|remote-debugging' } | Select-Object -First 6 | ForEach-Object { "CHROME PID $($_.ProcessId): $($_.CommandLine.Substring(0,[Math]::Min(200,$_.CommandLine.Length)))" }
"--- total chrome ---"
(Get-Process chrome -ErrorAction SilentlyContinue).Count
