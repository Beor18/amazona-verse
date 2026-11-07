$procs = Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object { $_.CommandLine -match 'kimi' }
$n = 0
foreach ($p in $procs) { try { Stop-Process -Id $p.ProcessId -Force -ErrorAction Stop; $n++ } catch {} }
Write-Output ("killed: " + $n)
Start-Sleep 2
$left = (Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object { $_.CommandLine -match 'kimi' }).Count
Write-Output ("kimi chrome left: " + $left)
Get-ChildItem $env:TEMP -Directory -Filter 'kimi*' | ForEach-Object { Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue }
Write-Output "profiles cleaned"
