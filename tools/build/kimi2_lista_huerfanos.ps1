Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object { $_.CommandLine -match 'headless' } | ForEach-Object {
  $p = 'MUERTO'
  try { $p = (Get-Process -Id $_.ParentProcessId -ErrorAction Stop).Name } catch {}
  $m = [regex]::Match($_.CommandLine, 'Temp.(kimi[^\"]*)')
  $perfil = if ($m.Success) { $m.Groups[1].Value } else { '?' }
  Write-Output ([string]$_.ProcessId + ' padre=' + [string]$_.ParentProcessId + ' (' + $p + ') :: ' + $perfil)
}
