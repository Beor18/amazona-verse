# KIMI-318: matar SOLO el arbol chrome huérfano kimi3s320-t4H9dM (nodo padre muerto).
# Los perfiles vivos (p. ej. kimi3s320-dZYgQL con node vivo) NO se tocan.
$ErrorActionPreference = 'SilentlyContinue'
$raices = Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object { $_.CommandLine -like '*kimi3s320-t4H9dM*' }
foreach ($r in $raices) {
  $vivo = Get-Process -Id $r.ProcessId -ErrorAction SilentlyContinue
  if ($vivo) { taskkill /PID $r.ProcessId /T /F }
}
'hecho'
