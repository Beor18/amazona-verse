# Kimi 1: matar SOLO Chrome headless huérfanos de perfiles kimi2-* (sin node padre vivo).
# Los perfiles con proceso node vivo (p. ej. kimi3q-* de la sesión activa de Kimi 3) NO se tocan.
$patrones = 'kimi2-TxtX7y', 'kimi2-cqUUwy', 'kimi2-7RgWzQ', 'kimi2-x9UPcg', 'kimi2-DgdU12'
$procs = Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object {
  $cl = $_.CommandLine
  $cl -match 'user-data-dir' -and ($patrones | Where-Object { $cl -match [regex]::Escape($_) })
}
$matados = 0
foreach ($p in $procs) {
  try { Stop-Process -Id $p.ProcessId -Force -ErrorAction Stop; $matados++ } catch {}
}
Write-Output "matados=$matados"
