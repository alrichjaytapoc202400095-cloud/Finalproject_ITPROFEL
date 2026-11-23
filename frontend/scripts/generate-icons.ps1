# Generates the PWA PNG icons (192, 512, maskable 512, apple-touch 180)
# Run from the frontend folder: powershell -File scripts/generate-icons.ps1
Add-Type -AssemblyName System.Drawing

$outDir = Join-Path $PSScriptRoot '..\public\icons'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

function New-RoundedPath([single]$x, [single]$y, [single]$w, [single]$h, [single]$r) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $path.AddArc($x, $y, $d, $d, 180, 90)
  $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  return $path
}

function New-Icon([int]$size, [string]$file, [bool]$maskable) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.Clear([System.Drawing.Color]::Transparent)

  # Campus maroon field (full bleed for the maskable icon, rounded for the rest).
  $maroon = [System.Drawing.ColorTranslator]::FromHtml('#7B1F2B')
  $maroonDark = [System.Drawing.ColorTranslator]::FromHtml('#5C111C')
  if ($maskable) {
    $g.FillRectangle((New-Object System.Drawing.SolidBrush($maroon)), 0, 0, $size, $size)
  } else {
    $radius = [single]($size * 0.22)
    $path = New-RoundedPath 0 0 $size $size $radius
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
      (New-Object System.Drawing.Point(0, 0)),
      (New-Object System.Drawing.Point($size, $size)),
      $maroon,
      $maroonDark
    )
    $g.FillPath($brush, $path)
    $brush.Dispose()
    $path.Dispose()
  }

  # Scale factor: maskable art stays inside the 80% safe circle.
  $scale = if ($maskable) { 0.52 } else { 0.72 }
  $cw = [single]($size * $scale)
  $ch = [single]($cw * 0.70)
  $cx = [single](($size - $cw) / 2)
  $cy = [single](($size - $ch) / 2)

  $cream = [System.Drawing.ColorTranslator]::FromHtml('#FFF6E9')
  $creamShade = [System.Drawing.ColorTranslator]::FromHtml('#F2D9B8')
  $gold = [System.Drawing.ColorTranslator]::FromHtml('#E8B04B')

  # Open book: two page quadrilaterals with a soft centre gutter.
  $left = New-Object System.Drawing.Drawing2D.GraphicsPath
  $left.AddPolygon(@(
    (New-Object System.Drawing.PointF($cx, ($cy + $ch * 0.14))),
    (New-Object System.Drawing.PointF(($cx + $cw * 0.47), ($cy + $ch * 0.02))),
    (New-Object System.Drawing.PointF(($cx + $cw * 0.47), ($cy + $ch * 0.86))),
    (New-Object System.Drawing.PointF($cx, ($cy + $ch)))
  ))
  $right = New-Object System.Drawing.Drawing2D.GraphicsPath
  $right.AddPolygon(@(
    (New-Object System.Drawing.PointF(($cx + $cw), ($cy + $ch * 0.14))),
    (New-Object System.Drawing.PointF(($cx + $cw * 0.53), ($cy + $ch * 0.02))),
    (New-Object System.Drawing.PointF(($cx + $cw * 0.53), ($cy + $ch * 0.86))),
    (New-Object System.Drawing.PointF(($cx + $cw), ($cy + $ch)))
  ))
  $leftBrush = New-Object System.Drawing.SolidBrush($cream)
  $rightBrush = New-Object System.Drawing.SolidBrush($creamShade)
  $g.FillPath($leftBrush, $left)
  $g.FillPath($rightBrush, $right)

  # Page lines.
  $linePen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml('#B98A74'), [single]($size * 0.012))
  $linePen.StartCap = 'Round'
  $linePen.EndCap = 'Round'
  for ($i = 1; $i -le 3; $i++) {
    $ly = $cy + $ch * (0.32 + $i * 0.15)
    $g.DrawLine($linePen, $cx + $cw * 0.09, $ly, $cx + $cw * 0.38, ($ly - $ch * 0.05))
    $g.DrawLine($linePen, $cx + $cw * 0.62, ($ly - $ch * 0.05), $cx + $cw * 0.91, $ly)
  }

  # Gold bookmark over the spine.
  $bookmark = New-Object System.Drawing.Drawing2D.GraphicsPath
  $bw = [single]($cw * 0.11)
  $bx = [single]($cx + $cw * 0.445)
  $by = [single]($cy - $ch * 0.02)
  $bh = [single]($ch * 0.36)
  $bookmark.AddPolygon(@(
    (New-Object System.Drawing.PointF($bx, $by)),
    (New-Object System.Drawing.PointF(($bx + $bw), $by)),
    (New-Object System.Drawing.PointF(($bx + $bw), ($by + $bh))),
    (New-Object System.Drawing.PointF(($bx + $bw / 2), ($by + $bh * 0.78))),
    (New-Object System.Drawing.PointF($bx, ($by + $bh)))
  ))
  $goldBrush = New-Object System.Drawing.SolidBrush($gold)
  $g.FillPath($goldBrush, $bookmark)

  # Cleanup.
  $linePen.Dispose(); $leftBrush.Dispose(); $rightBrush.Dispose(); $goldBrush.Dispose()
  $left.Dispose(); $right.Dispose(); $bookmark.Dispose()

  $target = Join-Path $outDir $file
  $bmp.Save($target, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
  Write-Host "wrote $target"
}

New-Icon 192 'icon-192.png' $false
New-Icon 512 'icon-512.png' $false
New-Icon 512 'icon-maskable-512.png' $true
New-Icon 180 'apple-touch-icon.png' $false
