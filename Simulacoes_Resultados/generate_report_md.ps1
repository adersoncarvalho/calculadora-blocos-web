# generate_report_md.ps1
$baseDir = $PSScriptRoot
if (-not $baseDir) { $baseDir = "c:\Users\Usuário\Desktop\controle\Simulacoes_Resultados" }

$jsonPath = Join-Path $baseDir "simulations.json"
$jsonText = [System.IO.File]::ReadAllText($jsonPath, [System.Text.Encoding]::UTF8)
$sims = $jsonText | ConvertFrom-Json

$sb = New-Object System.Text.StringBuilder

[void]$sb.AppendLine("# Relatório Técnico de Simulações de Diagramas de Blocos")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("Este relatório consolida a resolução analítica, diagramas gráficos vetoriais e capturas de tela (prints) de **20 simulações inéditas** com funções de transferência contendo valores numéricos e dinâmicas polinomiais reais. As simulações estão divididas equitativamente entre as quatro topologias fundamentais da Engenharia de Controle (5 simulações por topologia).")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("---")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("## Estrutura dos Arquivos Gerados")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("- **Painel Interativo Geral**: [index.html](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/index.html)")
[void]$sb.AppendLine("- **Pasta de Capturas (Prints PNG)**: [prints/](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/prints/)")
[void]$sb.AppendLine("- **Pasta de Relatórios HTML**: [relatorios_html/](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/relatorios_html/)")
[void]$sb.AppendLine("- **Pasta de Diagramas SVG**: [diagramas_svg/](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/diagramas_svg/)")
[void]$sb.AppendLine("- **Base de Dados Estruturada**: [simulations.json](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/simulations.json)")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("---")
[void]$sb.AppendLine("")

$topoNames = @{
    "top1" = "1. Topologia 1 — Associação em Cascata / Série"
    "top2" = "2. Topologia 2 — Associação em Paralelo / Soma"
    "top3" = "3. Topologia 3 — Realimentação / Malha Fechada"
    "top4" = "4. Topologia 4 — Topologias Mistas / Aninhadas"
}

$currentTopo = ""

foreach ($s in $sims) {
    if ($s.topoKey -ne $currentTopo) {
        $currentTopo = $s.topoKey
        [void]$sb.AppendLine("## $($topoNames[$currentTopo])")
        [void]$sb.AppendLine("")
    }

    $polosStr = ($s.polos -join ", ")
    $zerosStr = ($s.zeros -join ", ")
    $finalLatex = $s.finalLatex
    $ganhoDC = $s.ganhoDC
    $stepLatex = $s.stepLatex

    [void]$sb.AppendLine("### Simulação $($s.num): $($s.titulo)")
    [void]$sb.AppendLine("- **Arquivos**: [Relatório HTML](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/relatorios_html/$($s.id).html) | [Print PNG](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/prints/$($s.id).png) | [Diagrama SVG](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/diagramas_svg/$($s.id).svg)")
    [void]$sb.AppendLine("- **Descrição**: $($s.subtitulo)")
    [void]$sb.AppendLine("- **Passo a Passo**: $($s.stepDesc)")
    [void]$sb.AppendLine("- **Memorial em LaTeX**:")
    [void]$sb.AppendLine("$$" + $stepLatex + "$$")
    [void]$sb.AppendLine("- **Função Equivalente**: `$$" + $finalLatex + "$$`")
    [void]$sb.AppendLine("- **Ordem**: $($s.ordem) | **Zeros**: $zerosStr")
    [void]$sb.AppendLine("- **Polos**: $polosStr ($($s.estabilidade))")
    [void]$sb.AppendLine("- **Ganho DC**: `$ganhoDC`")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("---")
    [void]$sb.AppendLine("")
}

[void]$sb.AppendLine("## Quadro Resumo Geral das 20 Simulações")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("| ID | Topologia | Título | Ordem | Zeros | Polos | Estabilidade | Ganho DC |")
[void]$sb.AppendLine("|:---|:---|:---|:---:|:---|:---|:---:|:---:|")

$topoShort = @{
    "top1" = "Cascata / Série"
    "top2" = "Paralelo / Soma"
    "top3" = "Realimentação"
    "top4" = "Mistas"
}

foreach ($s in $sims) {
    $tShort = $topoShort[$s.topoKey]
    $polosShort = ($s.polos -join "; ") -replace 's_[0-9]+ = ', '' -replace 's_\{1,2\} = ', ''
    $zerosShort = ($s.zeros -join "; ")
    $gShort = $s.ganhoDC -replace 'T\(0\) = ', '' -replace 'U\(0\) = ', ''
    $stabShort = $s.estabilidade -replace '• ', ''
    [void]$sb.AppendLine("| $($s.num) | $tShort | $($s.titulo) | $($s.ordem) | $zerosShort | $polosShort | $stabShort | $gShort |")
}

$outPath = Join-Path $baseDir "relatorio_geral.md"
[System.IO.File]::WriteAllText($outPath, $sb.ToString(), [System.Text.Encoding]::UTF8)
Write-Output "relatorio_geral.md regerado com sucesso!"
