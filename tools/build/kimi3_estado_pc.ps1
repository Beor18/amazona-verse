$chrome = Get-Process chrome -ErrorAction SilentlyContinue
$node = Get-Process node -ErrorAction SilentlyContinue
"chrome: " + (@($chrome).Count) + "  node: " + (@($node).Count)
$procs = Get-CimInstance Win32_Process -Filter "Name='chrome.exe'"
$kimi = @($procs | Where-Object { $_.CommandLine -like '*kimi*' })
"chrome con perfil kimi*: " + $kimi.Count
$kimi | Select-Object -First 12 | ForEach-Object { "  PID=" + $_.ProcessId + " PPID=" + $_.ParentProcessId }
$nodos = Get-CimInstance Win32_Process -Filter "Name='node.exe'"
$nodos | ForEach-Object { "node PID=" + $_.ProcessId + " :: " + $_.CommandLine.Substring(0, [Math]::Min(100, $_.CommandLine.Length)) }
$vivos = @{}
$nodos | ForEach-Object { $vivos[$_.ProcessId] = $true }
$huerfanos = @($kimi | Where-Object { -not $vivos[$_.ParentProcessId] })
"chrome kimi* con padre node MUERTO: " + $huerfanos.Count
