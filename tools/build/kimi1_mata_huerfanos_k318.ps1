# KIMI-318: matar SOLO arboles chrome huérfanos cuyo perfil Temp coincide con el patron dado
# y cuyo proceso padre YA NO EXISTE. Los perfiles con padre vivo NO se tocan.
# Uso: powershell -File tools/build/kimi1_mata_huerfanos_k318.ps1 -Patron 'kimi2q-HkxOG1'
param([string]$Patron = 'kimi3s320-t4H9dM')
$ErrorActionPreference = 'SilentlyContinue'
$raices = Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object { $_.CommandLine -like "*$Patron*" }
$matados = 0
foreach ($r in $raices) {
  $padre = Get-Process -Id $r.ParentProcessId -ErrorAction SilentlyContinue
  if (-not $padre) { taskkill /PID $r.ProcessId /T /F | Out-Null; $matados++ }
}
"patron=$Patron arboles=$($raices.Count) matados=$matados"
