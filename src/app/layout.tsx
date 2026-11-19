import './globals.css';
import type { Metadata } from 'next';
import { IBM_Plex_Sans, Source_Serif_4, IBM_Plex_Mono } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap'
});

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-serif',
  display: 'swap'
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap'
});

export const metadata: Metadata = {
  title: 'ControleLab — Laboratório de Engenharia de Controle Clássico',
  description: 'Ambiente analítico e científico para modelagem, redução de diagramas de blocos no domínio de Laplace, Lugar das Raízes e projeto de controladores P, PD, PI, Avanço e Atraso de Fase.',
  keywords: ['Diagrama de Blocos', 'Engenharia de Controle', 'Laplace', 'Função de Transferência', 'Lugar das Raízes', 'Controladores', 'Regra de Mason']
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${ibmPlexSans.variable} ${sourceSerif.variable} ${ibmPlexMono.variable}`}>
      <body className="light-theme">
        <div className="container" id="mainContent">
          {children}
        </div>
        <Analytics />
      </body>
    </html>
  );
}
