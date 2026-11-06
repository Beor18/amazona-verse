$ErrorActionPreference = 'SilentlyContinue'
$procs = Get-CimInstance Win32_Process -Filter 'Name="chrome.exe"'
foreach ($p in $procs) {
  $cl = $p.CommandLine
  if ($cl -notmatch 'user-data-dir=("[^"]+"|[^\s"]+)') { continue }
  $dir = $Matches[1].Trim('"')
  if ($dir -notmatch 'kimi') { continue }
  $esHijo = $cl -match '--type='
  $ppid = $p.ParentProcessId
  $padre = Get-Process -Id $ppid
  $padreTxt = if ($padre) { "$($padre.ProcessName)($ppid)" } else { "MUERTO($ppid)" }
  $lineaCorta = ($cl -replace '\s+--', ' --')
  "{0}`t{1}`thijo={2}`tpadre={3}" -f $p.ProcessId, ($dir -replace '.*\\',''), $esHijo, $padreTxt
}
