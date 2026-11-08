# KIMI-244 · mata los chrome.exe cuyo CommandLine contiene el nombre de perfil dado (árbol zombi del arnés).
# Uso: powershell -NoProfile -ExecutionPolicy Bypass -File kimi2_mata_perfil.ps1 <texto-del-perfil>
param([Parameter(Mandatory = $true)][string]$Perfil)
$n = 0
Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object { $_.CommandLine -like ('*' + $Perfil + '*') } | ForEach-Object {
  try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop; $n++ } catch { }
}
"mata_perfil $Perfil : $n procesos"
