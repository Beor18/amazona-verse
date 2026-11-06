$ErrorActionPreference = 'SilentlyContinue'
$procs = Get-CimInstance Win32_Process -Filter 'Name="chrome.exe"'
$vivos = @{}
foreach ($p in (Get-Process)) { $vivos[$p.Id] = $true }
# raices (sin --type=) con perfil kimi: decide si el arbol es huérfano
$raices = @{}
foreach ($p in $procs) {
  $cl = $p.CommandLine
  if ($cl -notmatch 'user-data-dir=("[^"]+"|[^\s"]+)') { continue }
  $dir = $Matches[1].Trim('"')
  if ($dir -notmatch 'kimi') { continue }
  if ($cl -match '--type=') { continue }
  $ppid = $p.ParentProcessId
  $huerfano = -not $vivos.ContainsKey($ppid)
  $raices[$p.ProcessId] = @{ Dir = $dir; Huerfano = $huerfano }
}
# mata solo los del árbol huérfano (raíz + hijos con el mismo perfil)
$matar = @()
foreach ($p in $procs) {
  $cl = $p.CommandLine
  if ($cl -notmatch 'user-data-dir=("[^"]+"|[^\s"]+)') { continue }
  $dir = $Matches[1].Trim('"')
  foreach ($r in $raices.GetEnumerator()) {
    if ($r.Value.Dir -eq $dir -and $r.Value.Huerfano) { $matar += $p.ProcessId; break }
  }
}
"conservados (arbol con padre vivo):"
foreach ($r in $raices.GetEnumerator()) { if (-not $r.Value.Huerfano) { "  $($r.Value.Dir) (raiz $($r.Key))" } }
"matando $($matar.Count) chrome.exe de arboles huérfanos..."
foreach ($id in $matar) { Stop-Process -Id $id -Force }
Start-Sleep -Seconds 4
$quedan = (Get-CimInstance Win32_Process -Filter 'Name="chrome.exe"' | Where-Object { $_.CommandLine -match 'user-data-dir=.*kimi' } | Measure-Object).Count
"quedan chrome con perfil kimi: $quedan"
