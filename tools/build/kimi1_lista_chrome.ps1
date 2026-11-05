$procs = Get-CimInstance Win32_Process -Filter "Name='chrome.exe'"
$grupos = @{}
foreach ($p in $procs) {
  $perfil = 'sin-perfil'
  if ($p.CommandLine -match 'user-data-dir=([^\s"]+)') {
    $perfil = (Split-Path $Matches[1] -Leaf)
  }
  if (-not $grupos.ContainsKey($perfil)) { $grupos[$perfil] = @{ n = 0; padre = $p.ParentProcessId } }
  $grupos[$perfil].n++
}
$grupos.GetEnumerator() | Sort-Object { $_.Value.n } -Descending | Select-Object -First 20 | ForEach-Object {
  "{0,4}  {1}" -f $_.Value.n, $_.Key
}
