$candidatos = @(
  "$env:LOCALAPPDATA\Temp",
  "$env:APPDATA\npm-cache",
  "$env:LOCALAPPDATA\npm-cache",
  "$env:LOCALAPPDATA\pip\cache",
  "$env:USERPROFILE\.gradle\caches",
  "$env:LOCALAPPDATA\Microsoft\Windows\INetCache",
  "$env:LOCALAPPDATA\Yarn\Cache",
  "$env:LOCALAPPDATA\pnpm-store"
)
foreach ($c in $candidatos) {
  if (Test-Path $c) {
    $sum = (Get-ChildItem $c -Recurse -File -Force -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum
    if ($sum -gt 50MB) { Write-Output ([math]::Round($sum/1MB).ToString() + " MB  " + $c) }
  }
}
