$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Allowed = @{
  "index.html" = "text/html; charset=utf-8"
  "styles.css" = "text/css; charset=utf-8"
  "game.js"    = "text/javascript; charset=utf-8"
  "mapdata.js" = "text/javascript; charset=utf-8"
  "b-hocam.png" = "image/png"
  "menu-bg.png" = "image/png"
  "menu-earth.png" = "image/png"
  "turkey-phys.png" = "image/png"
  "haritason.png" = "image/png"
  "yazi.png" = "image/png"
  "title-gold2.png" = "image/png"
  "manifest.webmanifest" = "application/manifest+json"
}
$Listener = New-Object System.Net.HttpListener
$Port = 0
$LanIps = @()
try {
  $LanIps = @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
    Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" -and $_.PrefixOrigin -ne "WellKnown" } |
    Select-Object -ExpandProperty IPAddress)
} catch {
  $LanIps = @([System.Net.Dns]::GetHostAddresses($env:COMPUTERNAME) |
    Where-Object { $_.AddressFamily -eq "InterNetwork" } |
    ForEach-Object { $_.ToString() } |
    Where-Object { $_ -notlike "127.*" -and $_ -notlike "169.254.*" })
}
foreach ($p in 17867, 17868, 17869, 17870, 17871) {
  try {
    $try = New-Object System.Net.HttpListener
    $try.Prefixes.Add("http://127.0.0.1:$p/")
    foreach ($ip in $LanIps) {
      try { $try.Prefixes.Add("http://$ip:$p/") } catch {}
    }
    $try.Start()
    $Listener = $try
    $Port = $p
    break
  } catch {}
}
if ($Port -eq 0) { exit 1 }
$tel = Join-Path $Root "TELEFON.txt"
if ($LanIps.Count) {
  $lines = @("iPhone Safari:") + ($LanIps | ForEach-Object { "http://${_}:$Port/" }) + @("", "Paylaş → Ana Ekrana Ekle", "Bilgisayar penceresi açık kalsın.")
  Set-Content -LiteralPath $tel -Value $lines -Encoding UTF8
} else {
  Set-Content -LiteralPath $tel -Value "Aynı Wi-Fi bulunamadı." -Encoding UTF8
}

function Find-Browser {
  $cands = @(
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
    "$env:LOCALAPPDATA\Microsoft\Edge\Application\msedge.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
  )
  foreach ($c in $cands) { if ($c -and (Test-Path -LiteralPath $c)) { return $c } }
  return $null
}

$browser = Find-Browser
$profile = Join-Path $env:TEMP "yurt-benimhocam"
if ($browser) {
  Start-Process -FilePath $browser -ArgumentList @(
    "--app=http://127.0.0.1:$Port/",
    "--window-size=880,940",
    "--user-data-dir=$profile",
    "--no-first-run",
    "--no-default-browser-check"
  ) | Out-Null
}

$gotBeat = $false
$lastBeat = Get-Date
$born = Get-Date
while ($Listener.IsListening) {
  $iar = $Listener.BeginGetContext($null, $null)
  if (-not $iar.AsyncWaitHandle.WaitOne(1500)) {
    $now = Get-Date
    if ($gotBeat -and (($now - $lastBeat).TotalSeconds -gt 5)) { break }
    if (-not $gotBeat -and (($now - $born).TotalSeconds -gt 40)) { break }
    continue
  }
  try { $ctx = $Listener.EndGetContext($iar) } catch { break }
  $req = $ctx.Request
  $res = $ctx.Response
  $path = [Uri]::UnescapeDataString($req.Url.AbsolutePath)
  if ($path.StartsWith("/__ping")) {
    $gotBeat = $true
    $lastBeat = Get-Date
    $res.StatusCode = 204
    $res.Close()
    continue
  }
  if ($path.StartsWith("/__lan")) {
    $urls = @($LanIps | ForEach-Object { "http://${_}:$Port/" })
    $json = '{"port":' + $Port + ',"urls":[' + (($urls | ForEach-Object { '"' + $_ + '"' }) -join ",") + "]}"
    $bytes = [Text.Encoding]::UTF8.GetBytes($json)
    $res.ContentType = "application/json; charset=utf-8"
    $res.Headers.Add("Cache-Control", "no-store")
    $res.OutputStream.Write($bytes, 0, $bytes.Length)
    $res.Close()
    continue
  }
  $rel = if ($path -eq "/") { "index.html" } else { $path.TrimStart("/") }
  if ($Allowed.ContainsKey($rel) -and (Test-Path -LiteralPath (Join-Path $Root $rel))) {
    $bytes = [System.IO.File]::ReadAllBytes((Join-Path $Root $rel))
    $res.ContentType = $Allowed[$rel]
    $res.Headers.Add("Cache-Control", "no-store")
    $res.OutputStream.Write($bytes, 0, $bytes.Length)
  } else {
    $res.StatusCode = 404
  }
  $res.Close()
}
try { $Listener.Stop() } catch {}
try { $Listener.Close() } catch {}
