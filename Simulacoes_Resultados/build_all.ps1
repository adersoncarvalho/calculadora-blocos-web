# build_all.ps1
$ErrorActionPreference = "Stop"

$baseDir = $PSScriptRoot
if (-not $baseDir) { $baseDir = "c:\Users\Usuário\Desktop\controle\Calculadora_Blocos\Simulacoes_Resultados" }
$jsonPath = Join-Path $baseDir "simulations.json"
$templatePath = Join-Path $baseDir "template.html"
$svgDir = Join-Path $baseDir "diagramas_svg"
$htmlDir = Join-Path $baseDir "relatorios_html"
$printsDir = Join-Path $baseDir "prints"

# Ler dados e template
$jsonText = [System.IO.File]::ReadAllText($jsonPath, [System.Text.Encoding]::UTF8)
$template = [System.IO.File]::ReadAllText($templatePath, [System.Text.Encoding]::UTF8)
$sims = $jsonText | ConvertFrom-Json

Write-Output "Carregadas $($sims.Count) simulações."

# Obter caminhos curtos (8.3) para evitar problemas de encoding com msedge
$fso = New-Object -ComObject Scripting.FileSystemObject
$shortHtmlDir = $fso.GetFolder($htmlDir).ShortPath
$shortPrintsDir = $fso.GetFolder($printsDir).ShortPath
$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

foreach ($sim in $sims) {
    $id = $sim.id
    Write-Output "Processando $id ($($sim.titulo))..."

    # 1. Salvar SVG standalone
    $standaloneSvg = $sim.svg
    if (-not ($standaloneSvg -match 'xmlns=')) {
        $standaloneSvg = $standaloneSvg -replace '<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '
    }
    $svgFile = Join-Path $svgDir "$id.svg"
    [System.IO.File]::WriteAllText($svgFile, $standaloneSvg, [System.Text.Encoding]::UTF8)

    # 2. Gerar HTML a partir do template
    $polosHtml = ""
    foreach ($p in $sim.polos) {
        $polosHtml += "<span class=`"katex-inline`" data-latex=`"$p`"></span><br>`n"
    }

    $c = $template
    $c = $c.Replace("{{NUM}}", [string]$sim.num)
    $c = $c.Replace("{{ID}}", [string]$sim.id)
    $c = $c.Replace("{{TITULO}}", [string]$sim.titulo)
    $c = $c.Replace("{{SUBTITULO}}", [string]$sim.subtitulo)
    $c = $c.Replace("{{BADGE_CLASS}}", "badge-" + $sim.topoKey)
    $c = $c.Replace("{{TOPO_BADGE}}", [string]$sim.topoBadge)
    $c = $c.Replace("{{SVG_CONTENT}}", [string]$sim.svg)
    $c = $c.Replace("{{STEP_TITLE}}", [string]$sim.stepTitle)
    $c = $c.Replace("{{STEP_DESC}}", [string]$sim.stepDesc)
    $c = $c.Replace("{{STEP_LATEX}}", [string]$sim.stepLatex)
    $c = $c.Replace("{{FINAL_LATEX}}", [string]$sim.finalLatex)
    $c = $c.Replace("{{POLOS_HTML}}", $polosHtml)
    $c = $c.Replace("{{ESTABILIDADE}}", [string]$sim.estabilidade)
    $c = $c.Replace("{{ORDEM}}", [string]$sim.ordem)
    $c = $c.Replace("{{ZEROS}}", [string]$sim.zeros)
    $c = $c.Replace("{{GANHO_DC}}", [string]$sim.ganhoDC)

    $htmlFile = Join-Path $htmlDir "$id.html"
    [System.IO.File]::WriteAllText($htmlFile, $c, [System.Text.Encoding]::UTF8)

    # 3. Executar Edge headless para captura
    $shortHtmlFile = "$shortHtmlDir\$id.html"
    $shortPngFile = "$shortPrintsDir\$id.png"
    $winH = if ($sim.windowH) { $sim.windowH } else { 960 }
    $fileUrl = "file:///$($shortHtmlFile -replace '\\', '/')"

    $args = @(
        "--headless=new",
        "--screenshot=$shortPngFile",
        "--window-size=1100,$winH",
        "--hide-scrollbars",
        "--disable-gpu",
        "--run-all-compositor-stages-before-draw",
        "--virtual-time-budget=2000",
        $fileUrl
    )

    $proc = Start-Process -FilePath $edgePath -ArgumentList $args -NoNewWindow -PassThru -Wait
    if (-not (Test-Path (Join-Path $printsDir "$id.png"))) {
        Write-Warning "Falha ao gerar captura de $id"
    } else {
        $len = (Get-Item (Join-Path $printsDir "$id.png")).Length
        Write-Output " -> OK: $id.png ($([math]::Round($len / 1KB, 1)) KB)"
    }
}

Write-Output "Processamento de todas as simulações concluído com sucesso."
