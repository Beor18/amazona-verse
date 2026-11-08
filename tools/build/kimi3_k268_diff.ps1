# KIMI-268 · diff de píxeles entre dos capturas (criterio KIMI-219: % px con canal >4/255 y media de delta).
# Uso: powershell -File tools/build/kimi3_k268_diff.ps1 <antes.jpg> <despues.jpg> [recorte x,y,w,h]
param([Parameter(Mandatory=$true)][string]$Antes, [Parameter(Mandatory=$true)][string]$Despues, [string]$Crop)
Add-Type -AssemblyName System.Drawing
$a = [System.Drawing.Bitmap]::FromFile((Resolve-Path $Antes).Path)
$b = [System.Drawing.Bitmap]::FromFile((Resolve-Path $Despues).Path)
if ($a.Width -ne $b.Width -or $a.Height -ne $b.Height) { Write-Output "DIM DISTINTAS $($a.Width)x$($a.Height) vs $($b.Width)x$($b.Height)"; exit 1 }
$x0=0; $y0=0; $w=$a.Width; $h=$a.Height
if ($Crop) { $p=$Crop -split ','; $x0=[int]$p[0]; $y0=[int]$p[1]; $w=[int]$p[2]; $h=[int]$p[3] }
$fuera=0; $suma=0L; $n=0L
for ($y=$y0; $y -lt $y0+$h; $y++) {
  for ($x=$x0; $x -lt $x0+$w; $x++) {
    $ca=$a.GetPixel($x,$y); $cb=$b.GetPixel($x,$y)
    $d=[Math]::Max([Math]::Abs($ca.R-$cb.R), [Math]::Max([Math]::Abs($ca.G-$cb.G), [Math]::Abs($ca.B-$cb.B)))
    if ($d -gt 4) { $fuera++ }
    $suma+=$d; $n++
  }
}
Write-Output ("px>{4}/255: {0:N2} %  · media {1:N3}  · px {2}  · region {3}" -f (100.0*$fuera/$n), ($suma/$n), $n, "${w}x${h}@${x0},${y0}", 4)
$a.Dispose(); $b.Dispose()
