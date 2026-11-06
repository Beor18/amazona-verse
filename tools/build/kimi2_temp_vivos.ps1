$procs = Get-CimInstance Win32_Process -Filter 'Name="chrome.exe" OR Name="node.exe"'
$vivos = @{}
foreach ($p in $procs) {
  $cl = $p.CommandLine
  if ($cl -match 'user-data-dir=("[^"]+"|[^\s"]+)') {
    $dir = $Matches[1].Trim('"')
    $vivos[$dir] = $p.ProcessId
  }
}
"=== perfiles chrome vivos (con proceso) ==="
$vivos.GetEnumerator() | ForEach-Object { "$($_.Value)`t$($_.Key)" }
"=== procesos node con kimi en linea de comandos ==="
foreach ($p in $procs) {
  if ($p.Name -eq 'node.exe' -and $p.CommandLine -match 'kimi') {
    "$($p.ProcessId)`t$($p.CommandLine.Substring(0, [Math]::Min(140, $p.CommandLine.Length)))"
  }
}
