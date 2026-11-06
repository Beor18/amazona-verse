$corte = (Get-Date).AddHours(-2)
$dirs = Get-ChildItem 'C:\Users\kelvi\AppData\Local\Temp' -Directory -Filter 'kimi*' | Where-Object { $_.LastWriteTime -lt $corte }
$total = 0L; $n = 0
foreach ($d in $dirs) {
  $sum = (Get-ChildItem $d.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum
  if ($sum) { $total += $sum }
  $n++
}
Write-Output ("antiguos(>2h): dirs=" + $n + " MB~=" + [math]::Round($total / 1MB))
$recientes = Get-ChildItem 'C:\Users\kelvi\AppData\Local\Temp' -Directory -Filter 'kimi*' | Where-Object { $_.LastWriteTime -ge $corte }
Write-Output ("recientes(<=2h, intactos): " + $recientes.Count)
foreach ($r in $recientes) { Write-Output ("  KEEP " + $r.Name + " " + $r.LastWriteTime.ToString('MM-dd HH:mm')) }
