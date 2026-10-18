import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Calculadora e Laboratório de Redução em Diagramas de Blocos — EEL6005',
  description: 'Ambiente analítico interativo para modelagem e redução de diagramas de blocos no domínio de Laplace com cálculo de MMC, memorial LaTeX e análise de estabilidade.',
  keywords: ['Diagrama de Blocos', 'Engenharia de Controle', 'Laplace', 'Função de Transferência', 'EEL6005', 'KaTeX', 'Regra de Mason']
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="container" id="mainContent">
          {children}
        </div>
      </body>
    </html>
  );
}
