# Oyunu derler ve GitHub Pages'a yayınlar.
#   powershell -ExecutionPolicy Bypass -File yayinla.ps1 "Mesaj"
param([string]$Mesaj = "Güncelleme")
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

function Find-Tool($name, $extra) {
  $c = Get-Command $name -ErrorAction SilentlyContinue
  if ($c) { return $c.Source }
  foreach ($p in $extra) { if (Test-Path $p) { return $p } }
  $hit = Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Recurse -Filter "$name.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($hit) { return $hit.FullName }
  throw "$name bulunamadı."
}

$git = Find-Tool "git" @("$env:ProgramFiles\Git\cmd\git.exe", "$env:LOCALAPPDATA\Programs\Git\cmd\git.exe", "$env:LOCALAPPDATA\Temp\ha-tools\mingit\cmd\git.exe")

node build.js
& $git add -A
& $git commit -m $Mesaj
& $git push
Write-Host ""
Write-Host "Yayında (1-2 dk içinde güncellenir): https://oguzarik.github.io/harita-avcisi/" -ForegroundColor Green
