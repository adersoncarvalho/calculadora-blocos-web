$ErrorActionPreference = "Stop"
$fso = New-Object -ComObject Scripting.FileSystemObject
$simDir = $PSScriptRoot
$calcDir = (Get-Item $simDir).Parent.FullName
$calcBase = $fso.GetFolder($calcDir).ShortPath
$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$outDir = Join-Path $simDir "prints\theme_verification"
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force }
$shortOut = $fso.GetFolder($outDir).ShortPath

$baseUrl = "file:///" + ($calcBase -replace "\\", "/")

$items = @(
  @{ url = "$baseUrl/index.html?theme=dark"; out = "$shortOut\calc_dark.png"; w = 1200; h = 900 },
  @{ url = "$baseUrl/index.html?theme=light"; out = "$shortOut\calc_light.png"; w = 1200; h = 900 },
  @{ url = "$baseUrl/index.html?preset=mf_padrao&theme=light"; out = "$shortOut\calc_preset_light.png"; w = 1200; h = 1600 },
  @{ url = "$baseUrl/Simulacoes_Resultados/index.html?theme=dark"; out = "$shortOut\dashboard_dark.png"; w = 1200; h = 950 },
  @{ url = "$baseUrl/Simulacoes_Resultados/index.html?theme=light"; out = "$shortOut\dashboard_light.png"; w = 1200; h = 950 }
)

foreach ($it in $items) {
  $args = @(
    "--headless=new",
    "--screenshot=$($it.out)",
    "--window-size=$($it.w),$($it.h)",
    "--hide-scrollbars",
    "--disable-gpu",
    "--run-all-compositor-stages-before-draw",
    "--virtual-time-budget=2500",
    $it.url
  )
  $p = Start-Process -FilePath $edge -ArgumentList $args -NoNewWindow -PassThru -Wait
  Write-Output "Generated: $($it.out)"
}
