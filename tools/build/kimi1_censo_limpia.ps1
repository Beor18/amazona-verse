$test = Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object { $_.CommandLine -like '*user-data-dir*kimi*' -or $_.CommandLine -like '*user-data-dir*Temp*' }
foreach ($p in $test) { try { Stop-Process -Id $p.ProcessId -Force -ErrorAction Stop } catch { } }
Start-Sleep -Seconds 3
$chrome = @(Get-CimInstance Win32_Process -Filter "Name='chrome.exe'")
$test2 = @($chrome | Where-Object { $_.CommandLine -like '*user-data-dir*kimi*' -or $_.CommandLine -like '*user-data-dir*Temp*' })
Write-Output ('chrome test restantes: ' + $test2.Count + ' / total chrome ' + $chrome.Count)
$node = @(Get-CimInstance Win32_Process -Filter "Name='node.exe'")
Write-Output ('node: ' + $node.Count)
foreach ($p in $node) { $c = $p.CommandLine; if ($null -eq $c) { $c = '' }; Write-Output ('  ' + $p.ProcessId + ' ' + $c.Substring(0, [Math]::Min(140, $c.Length))) }
