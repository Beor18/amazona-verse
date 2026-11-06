$corte = (Get-Date).AddHours(-2)
$dirs = Get-ChildItem 'C:\Users\kelvi\AppData\Local\Temp' -Directory -Filter 'kimi*' | Where-Object { $_.LastWriteTime -lt $corte }
$liberado = 0L; $muertos = 0; $vivos = 0
foreach ($d in $dirs) {
  $nuevo = $d.FullName + '.kimi3del'
  try {
    Rename-Item -LiteralPath $d.FullName -NewName $nuevo -ErrorAction Stop
  } catch {
    $vivos++
    continue
  }
  $sum = (Get-ChildItem $nuevo -Recurse -File -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum
  Remove-Item -LiteralPath $nuevo -Recurse -Force -ErrorAction SilentlyContinue
  if ($sum) { $liberado += $sum }
  $muertos++
}
Write-Output ("muertos borrados=" + $muertos + " vivos(skipeados)=" + $vivos + " liberados MB=" + [math]::Round($liberado / 1MB))
