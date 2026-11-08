$nodes = Get-CimInstance Win32_Process -Filter "Name='node.exe'"
foreach ($n in $nodes) { Write-Output ("NODE " + $n.ProcessId + " :: " + $n.CommandLine) }
Write-Output "--- chrome perfiles kimi ---"
$profs = @{}
Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | ForEach-Object {
  if ($_.CommandLine -match 'user-data-dir=([^"]+)') {
    $p = $Matches[1]
    if ($p -match 'kimi') { $profs[$p] = 1 + $profs[$p] }
  }
}
foreach ($k in $profs.Keys) { Write-Output ($profs[$k].ToString() + " :: " + $k) }
