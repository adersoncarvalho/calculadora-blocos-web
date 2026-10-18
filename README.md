# Calculadora e Laboratório de Redução em Diagramas de Blocos — EEL6005

Ambiente analítico interativo, didático e profissional voltado à modelagem, simulação analítica e simplificação de diagramas de blocos no domínio da frequência complexa de Laplace ($s$). Desenvolvido especificamente para apoiar os alunos de Engenharia na disciplina **EEL6005 — Sistemas de Controle de Malha Fechada**.

---

## 1. Descrição do Projeto

A aplicação une rigor matemático e clareza didática, fornecendo:
- **Cálculo Algébrico Puro**: Manipulação exata de razões de polinômios em $s$, desenvolvimento passo a passo do Mínimo Múltiplo Comum (MMC) e simplificação automática por Máximo Divisor Comum (MDC) euclidiano.
- **Topologias Canônicas Fundamentais**: Redução direta de malha fechada clássica $G/(1 \pm GH)$, associações em série/cascata e associações em paralelo.
- **Construtor Livre de Diagramas**: Montagem interativa de circuitos arbitrários com blocos, nós de soma e ramificações, com redução automática baseada na **Fórmula do Ganho de Mason**.
- **Análise Dinâmica & Estabilidade**: Identificação de polos, zeros, Ganho DC ($s \to 0$), Tipo do Sistema (0, 1, 2) e parâmetros canônicos de 2ª ordem ($\omega_n, \zeta, \%OS, T_s$).
- **Modo de Prática Interativa (3 Níveis)**: Exercícios de reconhecimento topológico, escolha de estratégia de redução e verificador independente de equivalência algébrica.
- **Banco de 20 Simulações Reais**: Casos numéricos completos catalogados com diagramas SVG e memoriais analíticos.
- **Exportação para Scilab**: Geração dinâmica de scripts executáveis com comandos `syslin('c', ...)`, `roots()` e `csim('step', ...)`.

---

## 2. Tecnologias Utilizadas

- **Runtime & Linguagem**: Node.js v24.20.0 LTS e TypeScript (Strict Mode).
- **Framework Web**: Next.js 14 (App Router) com exportação estática otimizada para Edge.
- **Renderização de Interface**: React 18 e componentes modernos desacoplados.
- **Tipografia Matemática**: KaTeX local (fórmulas vetoriais renderizadas no cliente sem dependência de CDNs externos).
- **Testes Automatizados**: Vitest para testes unitários do motor matemático, análise de Mason e suíte de regressão.
- **Hospedagem & Deploy**: Vercel (Pure Static SPA Edge Hosting).

---

## 3. Arquitetura dos Módulos

O motor matemático funciona de maneira 100% independente do React, do DOM e de qualquer dependência visual, permitindo execução tanto no navegador quanto em scripts e suítes de testes:

```text
calculadora-blocos-web/
├── src/
│   ├── app/                            # Rotas e páginas do Next.js (App Router)
│   │   ├── globals.css                 # Folha de estilos e variáveis de tema
│   │   ├── layout.tsx                  # Estrutura base HTML e metadados
│   │   └── page.tsx                    # Página principal unificada
│   │
│   ├── components/                     # Componentes visuais reutilizáveis
│   │   ├── Header.tsx                  # Barra de navegação e atalhos
│   │   ├── MathView.tsx                # Renderizador matemático KaTeX
│   │   ├── ShortcutsModal.tsx          # Modal de ajuda de teclado
│   │   └── ThemeToggle.tsx             # Alternância e persistência de temas
│   │
│   ├── core/                           # MOTOR MATEMÁTICO INDEPENDENTE
│   │   ├── algebra/
│   │   │   ├── polynomial.ts           # Polinômios em s, normalização, MDC e divisão
│   │   │   ├── rational.ts             # Funções racionais, MMC, feedback e simplificação
│   │   │   └── parser.ts               # Interpretador de expressões algébricas
│   │   ├── reduction/
│   │   │   └── mason.ts                # Regra de Mason (caminhos, laços, delta e cofatores)
│   │   └── analysis/
│   │       └── stability.ts            # Polos, zeros, Routh-Hurwitz e parâmetros de 2ª ordem
│   │
│   └── features/                       # Módulos funcionais da aplicação
│       ├── builder/                    # Construtor visual interativo de diagramas
│       ├── calculator/                 # Topologias canônicas predefinidas
│       ├── guide/                      # Modal com compêndio teórico didático
│       ├── practice/                   # Modo de prática e laboratório em 3 níveis
│       └── simulations/                # Galeria interativa dos 20 casos reais
│
├── tests/                              # SUÍTE DE TESTES AUTOMATIZADOS (Vitest)
│   ├── algebra.test.ts                 # Testes unitários do motor de frações e MMC
│   ├── mason.test.ts                   # Testes da Regra de Mason
│   ├── stability.test.ts               # Testes de polos, zeros e Routh-Hurwitz
│   └── simulations.test.ts             # Testes de regressão das 20 simulações reais
│
├── next.config.mjs                     # Configuração de build e exportação estática
├── tsconfig.json                       # Configuração estrita do compilador TypeScript
├── vitest.config.ts                    # Configuração de testes unitários
└── vercel.json                         # Configuração para publicação na Vercel
```

---

## 4. Pré-requisitos

- **Node.js**: versão 18.x, 20.x ou 22.x/24.x LTS.
- **npm**: versão 9.x ou superior.
- **Navegador**: Microsoft Edge, Google Chrome, Mozilla Firefox, Opera ou Safari atualizados.

---

## 5. Instalação e Execução Local

### Instalação das Dependências:
```bash
npm install
```

### Executar em Modo de Desenvolvimento:
```bash
npm run dev
```
Abra [http://localhost:3000](http://localhost:3000) no seu navegador.

### Executar Suíte de Testes Automatizados:
```bash
npm test
```

### Gerar Compilação de Produção:
```bash
npm run build
```
O build estático pronto para produção é gerado na pasta `out/`.

---

## 6. Publicação na Vercel

A aplicação está configurada para deploy estático na Vercel sem custo de runtime e sem necessidade de variáveis de ambiente secretas:

1. Acesse o painel da [Vercel](https://vercel.com).
2. Clique em **Add New** ➔ **Project**.
3. Importe o repositório do projeto no GitHub.
4. O framework **Next.js** será detectado automaticamente.
5. Deixe os comandos padrão:
   - **Build Command**: `npm run build`
   - **Output Directory**: `out` ou `.next`
   - **Install Command**: `npm install`
6. Clique em **Deploy**. A publicação estará disponível em segundos.

---

## 7. Limitações Conhecidas

- **Ordem de Polinômios no Construtor**: Polinômios de ordem superior a 10 no Construtor Livre podem exigir maior tempo computacional para o cálculo de laços disjuntos de ordem superior no determinante $\Delta$ de Mason.
- **Entradas Simbólicas**: As variáveis de blocos são normalizadas preferencialmente na variável complexa de Laplace $s$ e ganhos estáticos numéricos ou simbólicos ($K_p, K_i, G_1, H_1$).

---

## 8. Autoria e Contato

- **Desenvolvedor**: Aderson Carvalho
- **Instituição**: Universidade Tecnológica Federal do Paraná (UTFPR)
- **Disciplina**: EEL6005 — Sistemas de Controle de Malha Fechada
- **Contato**: [aderson@alunos.utfpr.edu.br](mailto:aderson@alunos.utfpr.edu.br)
