Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | ForEach-Object {
  $parent = (Get-CimInstance Win32_Process -Filter ("ProcessId=" + $_.ParentProcessId) -ErrorAction SilentlyContinue).Name
  [string]$_.ProcessId + " parent=" + $parent + " :: " + ($_.CommandLine -replace '\s+', ' ').Substring(0, [Math]::Min(160, ($_.CommandLine -replace '\s+', ' ').Length))
}
