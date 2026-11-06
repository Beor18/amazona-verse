$ErrorActionPreference = 'SilentlyContinue'
$procs = Get-CimInstance Win32_Process -Filter 'Name="chrome.exe"'
$vivos = @{}
foreach ($p in (Get-Process)) { $vivos[$p.Id] = $true }
$padres = @{}
foreach ($p in $procs) { $padres[$p.ProcessId] = $p.ParentProcessId }

$arboles = @{}  # perfil -> @{ RootPid; Tipo; PPid; PadreVivo; PadreNombre }
foreach ($p in $procs) {
  $cl = $p.CommandLine
  if ($cl -notmatch 'user-data-dir=("[^"]+"|[^\s"]+)') { continue }
  $dir = $Matches[1].Trim('"')
  if ($dir -notmatch 'kimi') { continue }
  $esHijo = $cl -match '--type='
  if (-not $arboles.ContainsKey($dir)) { $arboles[$dir] = @{ Raiz = $null; Hijo = $false } }
  if (-not $esHijo) { $arboles[$dir].Raiz = $p.ProcessId } else { $arboles[$dir].Hijo = $true }
}

"=== arboles chrome con perfil kimi (raiz = proceso sin --type=) ==="
$matar = @()
foreach ($e in $arboles.GetEnumerator()) {
  $dir = $e.Key; $raiz = $e.Value.Raiz
  if ($null -eq $raiz) { "$dir`tSIN RAIZ visible (solo hijos)"; continue }
  $ppid = $padres[$raiz]
  $padreVivo = $vivos.ContainsKey($ppid)
  $padreNom = (Get-Process -Id $ppid).ProcessName
  $estado = if ($padreVino) {} else {}
  if ($padreVivo) { $estado = "PADRE VIVO: $padreNom ($ppid) -> SE CONSERVA" } else { $estado = "padre muerto ($ppid) -> HUERFANO"; $matar += $raiz }
  "$dir`traiz=$raiz ppid=$ppid $estado"
}
""
"=== raices a matar: $($matar.Count) ==="
$matar | ForEach-Object { "$_" }
if ($args -contains '--mata') {
  foreach ($pid in $matar) { & taskkill /F /T /PID $pid 2>&1 | Out-Null }
  Start-Sleep -Seconds 3
  foreach ($e in $arboles.GetEnumerator()) {
    $dir = $e.Key
    $aun = Get-CimInstance Win32_Process -Filter 'Name="chrome.exe"' | Where-Object { $_.CommandLine -like "*$dir*" }
    if (-not $aun) { Remove-Item -Recurse -Force $dir -ErrorAction SilentlyContinue; "perfil borrado: $dir" }
  }
}
