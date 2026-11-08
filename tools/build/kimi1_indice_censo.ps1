# kimi1_indice_censo.ps1 - Kimi 1 - censo del indice compartido de git (solo lectura por defecto)
# Familia de accidentes documentada (14+ casos, 3-8 nov): el indice por defecto queda con
# "revert staged fantasma" (borrados stageados de contenido que sigue igual en HEAD y en el
# worktree) tras commits con indice temporal (GIT_INDEX_FILE=$T) mal aislados - p. ej. si
# $T sale vacio de mktemp o el entorno se pierde en un pipeline, el read-tree cae en el
# indice real (hipotesis de Kimi 3, PEDIDOS 5-nov 22:20). Sintoma tipico:
#   git status  ->  MM <archivo>   (indice con borrado stageado + worktree con el contenido de HEAD)
# Este script NO toca nada: lista los casos sospechosos y, con -Repara, deja el indice como
# HEAD solo para esas rutas (git restore --staged; el worktree NO se toca, nada se borra).
# Uso:  powershell -File tools/build/kimi1_indice_censo.ps1 [-Repara]
param([switch]$Repara)

$ErrorActionPreference = 'Stop'
$repo = (git rev-parse --show-toplevel 2>$null)
if (-not $repo) { Write-Host 'FALLO: no es un repo git'; exit 1 }

Write-Host "== Censo del indice compartido en $repo =="
Write-Host ("HEAD: " + (git rev-parse --short HEAD))

$staged = git diff --cached --name-status
if (-not $staged) {
  Write-Host 'Indice limpio: sin cambios stageados. Nada que hacer.'
  exit 0
}

Write-Host "`nCambios stageados contra HEAD:"
$staged | ForEach-Object { Write-Host "  $_" }

# Caso fantasma documentado: 'D' stageado pero el archivo existe en el worktree
# y su contenido es IDENTICO al de HEAD (git diff HEAD -- <ruta> vacio).
$sospechosos = @()
foreach ($linea in $staged) {
  $partes = $linea -split "`t", 2
  if ($partes.Count -lt 2) { continue }
  $estado = $partes[0].Trim(); $ruta = $partes[1].Trim()
  if ($estado -notmatch '^D') { continue }
  if (-not (Test-Path (Join-Path $repo $ruta))) { continue }        # borrado real en worktree: no es fantasma
  $diffHead = git diff HEAD --name-only -- $ruta
  if (-not $diffHead) { $sospechosos += $ruta }                     # worktree == HEAD: revert staged fantasma
}

if (-not $sospechosos) {
  Write-Host "`n0 reverts staged fantasma detectados (los stageados que hay son reales: no tocar sin dueno)."
  exit 0
}

Write-Host "`nREVERTS STAGED FANTASMA detectados (borrado stageado, contenido intacto en HEAD y worktree):"
$sospechosos | ForEach-Object { Write-Host "  $_" }

if ($Repara) {
  Write-Host "`n-Repara: restaurando el indice a HEAD para esas rutas (worktree intacto, nada se borra)..."
  git restore --staged -- @sospechosos
  Write-Host 'Listo. Verifica con: git status --short (no debe quedar nada fuera de los ??)'
} else {
  Write-Host "`nSin -Repara: no se toco nada. Reparar manualmente con:"
  Write-Host ("  git restore --staged -- " + ($sospechosos -join ' '))
}

Write-Host "`nReceta segura de commit con indice temporal (obligatoria en esta carpeta):"
Write-Host '  $T = [IO.Path]::GetTempFileName(); $env:GIT_INDEX_FILE = $T; git read-tree HEAD'
Write-Host '  git add <tus rutas>'
Write-Host '  git diff --cached --stat            # solo deben salir TUS archivos'
Write-Host '  git commit -m "..."; Remove-Item Env:GIT_INDEX_FILE; Remove-Item $T'
Write-Host 'Aviso: si el entorno GIT_INDEX_FILE se pierde entre comandos, el siguiente git actua sobre el indice real.'
exit 0
