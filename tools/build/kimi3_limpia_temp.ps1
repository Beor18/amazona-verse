# Limpia perfiles temporales de Chrome huérfanos de las herramientas de Kimi 3.
# Solo borra perfiles cuyo proceso Chrome ya no existe (mata primero los zombis headless).
$prefijos = @('kimi3v-*', 'kimi3vA-*', 'kimi3vB-*', 'kimi3t-*', 'kimi3l-*')
$z = Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object { $_.CommandLine -match '--headless' -and $_.CommandLine -match 'Temp.kimi' }
Write-Output ('zombis chrome: ' + $z.Count)
$z | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 2
$temp = $env:TEMP
$total = 0
foreach ($p in $prefijos) {
  Get-ChildItem -Path $temp -Directory -Filter $p -ErrorAction SilentlyContinue | ForEach-Object {
    try {
      $tam = (Get-ChildItem $_.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum
      Remove-Item $_.FullName -Recurse -Force -ErrorAction Stop
      $total += $tam
      Write-Output ('borrado ' + $_.Name + ' ' + [math]::Round($tam / 1MB) + ' MB')
    } catch { Write-Output ('en uso, se conserva: ' + $_.Name) }
  }
}
Write-Output ('total liberado: ' + [math]::Round($total / 1MB) + ' MB')
