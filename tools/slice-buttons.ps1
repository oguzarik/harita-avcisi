# Beyaz zeminli buton sayfasını satırlara böler, beyazı şeffaf yapar, PNG olarak kaydeder.
#   powershell -ExecutionPolicy Bypass -File tools\slice-buttons.ps1 "C:\...\sheet.png"
param(
  [Parameter(Mandatory = $true)][string]$Src,
  [string[]]$Names = @("btn-bilmece", "btn-hiz", "btn-kpss", "btn-tuik", "btn-nasil"),
  [int]$OutWidth = 840
)
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $PSScriptRoot

$img = [System.Drawing.Image]::FromFile($Src)
$bmp = New-Object System.Drawing.Bitmap $img.Width, $img.Height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($bmp); $g.DrawImage($img, 0, 0, $img.Width, $img.Height); $g.Dispose(); $img.Dispose()
$w = $bmp.Width; $h = $bmp.Height
$rect = New-Object System.Drawing.Rectangle 0, 0, $w, $h
$data = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadWrite, $bmp.PixelFormat)
$stride = $data.Stride
$bytes = New-Object byte[] ($stride * $h)
[System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)

# Kaynak zaten şeffaf mı? (herhangi bir pikselin alfası düşükse beyaz temizliği yapılmaz)
$hasAlpha = $false
for ($i = 3; $i -lt $bytes.Length; $i += 4 * 97) { if ($bytes[$i] -lt 200) { $hasAlpha = $true; break } }
"kaynak şeffaf: $hasAlpha"

# 1) beyazı şeffaf yap: alfa = beyazdan uzaklık; rengi beyaz karışımından arındır
$rowInk = New-Object int[] $h
for ($y = 0; $y -lt $h; $y++) {
  $o = $y * $stride
  $ink = 0
  for ($x = 0; $x -lt $w; $x++) {
    if ($hasAlpha) {
      if ($bytes[$o + 3] -gt 40) { $ink++ }
      $o += 4
      continue
    }
    $b = $bytes[$o]; $gg = $bytes[$o + 1]; $r = $bytes[$o + 2]
    $mn = [Math]::Min($r, [Math]::Min($gg, $b))
    $d = 255 - $mn
    $a = if ($d -ge 90) { 255 } elseif ($d -le 6) { 0 } else { [int](($d - 6) * 255 / 84) }
    if ($a -gt 0 -and $a -lt 255) {
      $f = 255.0 / $a
      $r = [Math]::Max(0, [Math]::Min(255, [int](255 - (255 - $r) * $f)))
      $gg = [Math]::Max(0, [Math]::Min(255, [int](255 - (255 - $gg) * $f)))
      $b = [Math]::Max(0, [Math]::Min(255, [int](255 - (255 - $b) * $f)))
      $bytes[$o] = $b; $bytes[$o + 1] = $gg; $bytes[$o + 2] = $r
    }
    $bytes[$o + 3] = $a
    if ($a -gt 40) { $ink++ }
    $o += 4
  }
  $rowInk[$y] = $ink
}
[System.Runtime.InteropServices.Marshal]::Copy($bytes, 0, $data.Scan0, $bytes.Length)
$bmp.UnlockBits($data)

# 2) satır bantlarını bul (en az %20 dolu satırlar buton gövdesi sayılır)
$thr = [int]($w * 0.2)
$all = New-Object System.Collections.ArrayList; $inBand = $false; $start = 0
for ($y = 0; $y -lt $h; $y++) {
  $on = $rowInk[$y] -ge $thr
  if ($on -and -not $inBand) { $inBand = $true; $start = $y }
  elseif (-not $on -and $inBand) { $inBand = $false; [void]$all.Add([pscustomobject]@{ a = $start; b = ($y - 1) }) }
}
if ($inBand) { [void]$all.Add([pscustomobject]@{ a = $start; b = ($h - 1) }) }
$bands = @($all | Where-Object { ($_.b - $_.a) -gt 40 })
"bands: $($bands.Count)  " + (($bands | ForEach-Object { "$($_.a)-$($_.b)" }) -join ", ")
if ($bands.Count -ne $Names.Count) { throw "Beklenen $($Names.Count) buton, bulunan $($bands.Count)." }

# 3) her bandı kenar payıyla kes, yatayda kırp, ölçekle, kaydet
for ($i = 0; $i -lt $bands.Count; $i++) {
  $y0 = [Math]::Max(0, $bands[$i].a - 18); $y1 = [Math]::Min($h - 1, $bands[$i].b + 18)
  # yatay sınır: bu banttaki alfa>40 sütunlar
  $x0 = $w; $x1 = 0
  for ($y = $y0; $y -le $y1; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
      if ($bmp.GetPixel($x, $y).A -gt 40) { if ($x -lt $x0) { $x0 = $x }; if ($x -gt $x1) { $x1 = $x } }
    }
  }
  $x0 = [Math]::Max(0, $x0 - 10); $x1 = [Math]::Min($w - 1, $x1 + 10)
  $cw = $x1 - $x0 + 1; $ch = $y1 - $y0 + 1
  $crop = $bmp.Clone((New-Object System.Drawing.Rectangle $x0, $y0, $cw, $ch), $bmp.PixelFormat)
  $ow = [Math]::Min($OutWidth, $cw); $oh = [int][Math]::Round($ch * $ow / $cw)
  $out = New-Object System.Drawing.Bitmap $ow, $oh, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $og = [System.Drawing.Graphics]::FromImage($out)
  $og.InterpolationMode = "HighQualityBicubic"; $og.SmoothingMode = "HighQuality"; $og.PixelOffsetMode = "HighQuality"; $og.CompositingQuality = "HighQuality"
  $og.DrawImage($crop, 0, 0, $ow, $oh); $og.Dispose(); $crop.Dispose()
  $path = Join-Path $root "$($Names[$i]).png"
  $out.Save($path, [System.Drawing.Imaging.ImageFormat]::Png); $out.Dispose()
  "$($Names[$i]).png  ${ow}x${oh}  $((Get-Item $path).Length) bytes  (kaynak y $y0-$y1, x $x0-$x1)"
}
$bmp.Dispose()
