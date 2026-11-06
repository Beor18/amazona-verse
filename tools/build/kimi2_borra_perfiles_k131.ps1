$ErrorActionPreference = 'SilentlyContinue'
$chrome = Get-CimInstance Win32_Process -Filter 'Name="chrome.exe"'
Get-ChildItem "$env:TEMP" -Directory -Filter 'kimi*' | ForEach-Object {
  $n = $_.Name
  $aun = $false
  foreach ($c in $chrome) { if ($c.CommandLine -like "*$n*") { $aun = $true; break } }
  if (-not $aun) {
    Remove-Item -Recurse -Force $_.FullName
    if (Test-Path $_.FullName) { "NO SE PUDO BORRAR: $n" } else { "borrado: $n" }
  } else { "vivo, se conserva: $n" }
}
