# Bucle de trabajo continuo para Kimi en la PC Windows de Kelvin (3-nov-2026).
# Kimi en modo ventana se detiene al terminar cada tarea y espera a que alguien escriba.
# Este script lo relanza solo en modo sin ventana (kimi -p): hace una tarea, termina, y el bucle
# vuelve a empezar tras leer el bloque 📣 de docs/equipo/TAREAS_KIMI.md. Así nunca se queda parado.
#
# Uso (una ventana de PowerShell por sesión, cada una en su carpeta):
#   powershell -ExecutionPolicy Bypass -File C:\Users\kelvi\amazonaversegame\tools\kimi\bucle_kimi.ps1 -Carpeta C:\Users\kelvi\amazonaversegame  -Nombre "Kimi 1"
#   powershell -ExecutionPolicy Bypass -File C:\Users\kelvi\amazonaversegame\tools\kimi\bucle_kimi.ps1 -Carpeta C:\Users\kelvi\amazonaversegame2 -Nombre "Kimi 2"
#   powershell -ExecutionPolicy Bypass -File C:\Users\kelvi\amazonaversegame\tools\kimi\bucle_kimi.ps1 -Carpeta C:\Users\kelvi\amazonaversegame3 -Nombre "Kimi 3"
# Para pararlo: Ctrl+C en su ventana. El registro queda en <Carpeta>\..\kimi_logs\.
param(
  [Parameter(Mandatory = $true)][string]$Carpeta,
  [Parameter(Mandatory = $true)][string]$Nombre,
  [int]$PausaSegundos = 30
)
$ErrorActionPreference = 'Continue'
$kimi = Join-Path $env:USERPROFILE '.kimi-code\bin\kimi.exe'
if (-not (Test-Path $kimi)) { $kimi = 'kimi' }
$logs = Join-Path (Split-Path $Carpeta -Parent) 'kimi_logs'
New-Item -ItemType Directory -Force $logs | Out-Null
$slug = ($Nombre -replace '[^A-Za-z0-9]', '').ToLower()

# Que la PC no se duerma mientras el bucle corre
try {
  Add-Type -Namespace AV -Name Despierta -MemberDefinition '[System.Runtime.InteropServices.DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint e);' -ErrorAction Stop
  [AV.Despierta]::SetThreadExecutionState([uint32]2147483651) | Out-Null
} catch { Write-Host "(No pude pedir que la PC no se duerma; usa powercfg.)" }

$prompt = @"
Eres $Nombre, agente de gráficos y rendimiento de Amazona Verse (Three.js r128), en la PC Windows de Kelvin, carpeta $Carpeta, rama main (nunca crees ramas).
Esta es UNA vuelta de un bucle automático: nadie va a contestarte; decide tú según CLAUDE.md.
1. git pull --rebase origin main. Lee el bloque «📣 MENSAJE PARA KIMI» de docs/equipo/TAREAS_KIMI.md (punto 0: qué le toca a cada sesión) y tu fila EN CURSO.
2. Si tienes una tarea EN CURSO de $Nombre, avánzala; si no, toma la siguiente libre que el bloque 📣 asigne a $Nombre (o, si no hay, un bug gráfico abierto de docs/equipo/BUGS.md) y márcala «EN CURSO · $Nombre · <hora>».
3. Trabaja como mucho ~40 minutos y deja un avance que no rompa el juego: commit pequeño solo de tus archivos (git add <rutas>), mensaje en español con qué probaste y números (FPS, draw calls, triángulos, memoria), terminado en «Co-Authored-By: Kimi <noreply@moonshot.ai>»; git pull --rebase origin main; git push origin HEAD:main.
4. Escribe en tu fila de TAREAS_KIMI.md en qué vas o márcala «hecha · <commit> · resultado». No toques archivos de otra sesión ni de otro carril (ver el bloque 📣).
"@

$vuelta = 0
while ($true) {
  $vuelta++
  $hora = Get-Date -Format 'yyyy-MM-dd HH:mm'
  $log = Join-Path $logs "$slug-$(Get-Date -Format 'yyyyMMdd').log"
  Write-Host "[$hora] $Nombre · vuelta $vuelta"
  Add-Content $log "`n===== [$hora] vuelta $vuelta ====="
  Set-Location $Carpeta
  git pull --rebase origin main 2>&1 | Add-Content $log
  & $kimi -p $prompt 2>&1 | Tee-Object -FilePath $log -Append
  Write-Host "[$(Get-Date -Format 'HH:mm')] $Nombre terminó la vuelta $vuelta; la siguiente en $PausaSegundos s (Ctrl+C para parar)."
  Start-Sleep -Seconds $PausaSegundos
}
