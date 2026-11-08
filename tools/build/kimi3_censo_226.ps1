param()
$nodes = Get-CimInstance Win32_Process -Filter "Name='node.exe'"
foreach ($n in $nodes) {
  Write-Output ("NODE pid={0} start={1} cmd={2}" -f $n.ProcessId, $n.CreationDate, $n.CommandLine)
}
$chromes = Get-CimInstance Win32_Process -Filter "Name='chrome.exe'"
$kimi = @($chromes | Where-Object { $_.CommandLine -match 'user-data-dir=.*kimi' })
# raices: chrome kimi cuyo padre NO es chrome.exe (es node o muerto)
$porPid = @{}
foreach ($c in $kimi) { $porPid[$c.ProcessId] = $c }
foreach ($c in $kimi) {
  $p = $c.ParentProcessId
  if (-not $porPid.ContainsKey($p)) {
    $padre = Get-CimInstance Win32_Process -Filter "ProcessId=$p" -ErrorAction SilentlyContinue
    $perfil = 'desconocido'
    if ($c.CommandLine -match '--user-data-dir="?([^ "\x60]+)') { $perfil = $matches[1] }
    $tipo = if (-not $padre) { 'HUERFANO (padre muerto)' } else { 'padre=' + $padre.Name + ' pid=' + $padre.ProcessId }
    Write-Output ("RAIZ pid={0} start={1} perfil={2} -> {3}" -f $c.ProcessId, $c.CreationDate, $perfil, $tipo)
  }
}
Write-Output ("TOTAL chrome kimi={0}" -f $kimi.Count)
