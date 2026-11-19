export interface PrintableStep {
  title: string;
  description: string;
  latex: string;
}

export interface PrintMemorialPayload {
  title: string;
  subtitle?: string;
  statementLatex?: string;
  plantLatex?: string;
  controllerLatex?: string;
  diagnostics?: { label: string; value: string }[];
  whyText?: string;
  steps: PrintableStep[];
  scilabCode?: string;
}

/**
 * Abre uma janela limpa de impressão (otimizada para "Salvar como PDF")
 * usando o conteúdo renderizado de um elemento DOM (com KaTeX já compilado!).
 */
export function printElementAsPdf(element: HTMLElement | null, docTitle: string): void {
  if (typeof window === 'undefined' || !element) return;

  const printWin = window.open('', '_blank', 'width=960,height=780');
  if (!printWin) {
    window.print();
    return;
  }

  // Coleta links de stylesheet (inclui KaTeX CSS carregado no app)
  const linkTags: string[] = [];
  document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
    const href = link.getAttribute('href');
    if (href) {
      linkTags.push(`<link rel="stylesheet" href="${href}" />`);
    }
  });

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${docTitle}</title>
  ${linkTags.join('\n  ')}
  <style>
    :root {
      --bg: #ffffff;
      --card-bg: #ffffff;
      --code-bg: #f8fafc;
      --card-border: #cbd5e1;
      --text: #0f172a;
      --text-muted: #475569;
      --primary: #0369a1;
      --success: #047857;
      --danger: #b91c1c;
    }
    * { box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      background: #ffffff;
      color: #0f172a;
      margin: 0;
      padding: 24px 32px;
      line-height: 1.5;
    }
    .print-header {
      border-bottom: 2px solid #0369a1;
      padding-bottom: 10px;
      margin-bottom: 18px;
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .print-header h1 {
      margin: 0;
      font-size: 18px;
      color: #0369a1;
    }
    .print-header span {
      font-size: 11px;
      color: #64748b;
    }
    .no-print, button { display: none !important; }
    .katex-display { overflow-x: visible !important; margin: 6px 0 !important; }
    .stacked-math-line { margin: 4px 0; }
    div, section { break-inside: avoid; }
    @media print {
      body { padding: 10px 14px; }
      @page { margin: 14mm; size: A4; }
    }
  </style>
</head>
<body>
  <div class="print-header">
    <h1>${docTitle}</h1>
    <span>Memorial de Cálculo — Controle Clássico</span>
  </div>
  ${element.innerHTML}
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 350);
    };
  </script>
</body>
</html>`;

  printWin.document.open();
  printWin.document.write(html);
  printWin.document.close();
}
