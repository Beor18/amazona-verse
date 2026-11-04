param([string]$Filtro = 'kimi')
$procs = Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object { $_.CommandLine -like "*Temp*$Filtro*" }
$grupos = $procs | ForEach-Object { if ($_.CommandLine -match 'Temp[\\/]+((kimi|Kimi)[^ "\\/]*)') { $Matches[1] } } | Sort-Object -Unique
"Perfiles con chrome vivo: $($grupos -join ', ')"
"Total procesos chrome con perfil ${Filtro}: $($procs.Count)"
$vivos = Get-Process node -ErrorAction SilentlyContinue
"Procesos node vivos: $($vivos.Count)"
if ($procs) {
  $procs | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  "Matados: $($procs.Count)"
} else { "Nada que matar" }
