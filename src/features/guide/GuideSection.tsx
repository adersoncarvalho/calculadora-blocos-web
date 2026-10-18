'use client';

import React, { useState } from 'react';
import { MathView } from '@/components/MathView';

interface GuideSectionProps {
  onBack: () => void;
  onNavigate?: (view: 'builder' | 'practice' | 'simulations') => void;
}

export const GuideSection: React.FC<GuideSectionProps> = ({ onBack, onNavigate }) => {
  const [selectedTopic, setSelectedTopic] = useState<string>('todos');

  // Estado do Quiz de Fixação
  const [quizAnswers, setQuizAnswers] = useState<Record<string, { opt: string; isCorrect: boolean }>>({});

  const handleQuizSelect = (qId: string, opt: string, isCorrect: boolean) => {
    setQuizAnswers(prev => ({ ...prev, [qId]: { opt, isCorrect } }));
  };

  const topicsList = [
    { id: 'todos', num: '★', label: 'Ver Todos os 9 Tópicos' },
    { id: 'componentes', num: '1', label: 'Componentes & Sinais' },
    { id: 'ft_laplace', num: '2', label: 'Função de Transferência' },
    { id: 'cascata', num: '3', label: 'Cascata & Contra-exemplos' },
    { id: 'paralelo', num: '4', label: 'Paralelo & Contra-exemplos' },
    { id: 'malha_fechada', num: '5', label: 'Malha Fechada & Dedução' },
    { id: 'movendo_blocos', num: '6', label: 'Movendo Blocos & Nós' },
    { id: 'estrategia', num: '7', label: 'Estratégia de Redução' },
    { id: 'matematica_base', num: '8', label: 'Álgebra & MMC' },
    { id: 'quiz_fixacao', num: '9', label: 'Quiz de Fixação' }
  ];

  // Definições de marcadores SVG
  const svgArrowDefs = (
    <defs>
      <marker id="g-arr" viewBox="0 0 10 10" refX="7.5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1 L 9 5 L 0 9 z" fill="#38bdf8" />
      </marker>
      <marker id="g-arr-red" viewBox="0 0 10 10" refX="7.5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1 L 9 5 L 0 9 z" fill="#ef4444" />
      </marker>
      <marker id="g-arr-green" viewBox="0 0 10 10" refX="7.5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1 L 9 5 L 0 9 z" fill="#10b981" />
      </marker>
      <marker id="g-arr-purp" viewBox="0 0 10 10" refX="7.5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1 L 9 5 L 0 9 z" fill="#a855f7" />
      </marker>
    </defs>
  );

  return (
    <section style={{ maxWidth: '1240px', margin: '0 auto', paddingBottom: '50px' }}>
      {/* Top Bar Dedicada */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: '10px',
          padding: '14px 20px',
          marginBottom: '20px',
          boxShadow: '0 4px 18px rgba(0,0,0,0.35)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={onBack}
            style={{ padding: '8px 16px', fontSize: '0.86rem', fontWeight: 700, cursor: 'pointer' }}
          >
            ⬅ Voltar à Página Principal
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.35rem', color: 'var(--primary)', fontWeight: 800 }}>
              📖 Guia Didático e Compêndio Teórico
            </h1>
            <p style={{ margin: '2px 0 0 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              Fundamentação analítica clássica: Norman S. Nise e Katsuhiko Ogata
            </p>
          </div>
        </div>

        {onNavigate && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="filter-btn"
              onClick={() => onNavigate('practice')}
              style={{ fontSize: '0.82rem', padding: '6px 12px' }}
            >
              🧪 Ir para Laboratório
            </button>
            <button
              type="button"
              className="filter-btn"
              onClick={() => onNavigate('builder')}
              style={{ fontSize: '0.82rem', padding: '6px 12px' }}
            >
              🛠️ Ir para Construtor
            </button>
            <button
              type="button"
              className="filter-btn"
              onClick={() => onNavigate('simulations')}
              style={{ fontSize: '0.82rem', padding: '6px 12px' }}
            >
              📊 Ver 20 Simulações
            </button>
          </div>
        )}
      </div>

      {/* Trilha Visual de Aprendizagem Progressiva (Stepper) */}
      <div
        className="guide-stepper-trail"
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          padding: '10px 4px 14px 4px',
          marginBottom: '22px'
        }}
      >
        {topicsList.map(t => (
          <button
            key={t.id}
            type="button"
            className={`filter-btn ${selectedTopic === t.id ? 'active' : ''}`}
            onClick={() => setSelectedTopic(t.id)}
            style={{
              padding: '8px 14px',
              fontSize: '0.84rem',
              whiteSpace: 'nowrap',
              borderRadius: '999px'
            }}
          >
            <span style={{ marginRight: '6px', opacity: 0.75, fontWeight: 800 }}>{t.num}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* =========================================================
          TÓPICO 1: COMPONENTES BÁSICOS
          ========================================================= */}
      {(selectedTopic === 'todos' || selectedTopic === 'componentes') && (
        <div className="guide-topic-card" style={{ marginBottom: '28px' }}>
          <div className="guide-topic-title">
            <span>1. Componentes Básicos em Diagramas de Blocos</span>
          </div>
          <div className="guide-topic-body">
            <div className="guide-objective-badge">
              <b>🎯 Objetivo de Aprendizagem:</b> Identificar formalmente os 4 componentes elementares da modelagem por diagramas de blocos, suas equações nodais e o sentido estrito e unívoco de causalidade na propagação de sinais.
            </div>
            <p style={{ margin: '12px 0', color: 'var(--text-muted)' }}>
              Um diagrama de blocos de um sistema linear invariante no tempo (SLIT) expressa graficamente as relações de causa e efeito entre variáveis no domínio complexo de Laplace (<MathView math="s" inline />). Os quatro elementos fundamentais são representados abaixo:
            </p>

            <div className="components-grid">
              {/* Componente A: Sinais */}
              <div className="component-card">
                <div className="component-card-title">
                  <span>(a) Sinais / Variáveis</span>
                </div>
                <div className="component-svg-box">
                  <svg viewBox="0 0 240 60">
                    {svgArrowDefs}
                    <line x1="20" y1="35" x2="105" y2="35" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#g-arr)" />
                    <text x="60" y="24" fill="#94a3b8" fontSize="11" textAnchor="middle">R(s) [Entrada]</text>
                    <line x1="140" y1="35" x2="225" y2="35" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#g-arr)" />
                    <text x="180" y="24" fill="#94a3b8" fontSize="11" textAnchor="middle">C(s) [Saída]</text>
                  </svg>
                </div>
                <div className="component-card-desc">
                  Linha orientada com seta representando uma variável física no domínio de Laplace. A seta indica o sentido unívoco do fluxo de informação.
                </div>
                <div className="component-card-eq">
                  <MathView math="R(s) = \mathcal{L}\{r(t)\}, \quad C(s) = \mathcal{L}\{c(t)\}" block />
                </div>
              </div>

              {/* Componente B: Bloco Funcional */}
              <div className="component-card">
                <div className="component-card-title">
                  <span>(b) Bloco Funcional (Sistema)</span>
                </div>
                <div className="component-svg-box">
                  <svg viewBox="0 0 240 70">
                    {svgArrowDefs}
                    <line x1="15" y1="38" x2="72" y2="38" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#g-arr)" />
                    <text x="42" y="27" fill="#94a3b8" fontSize="10.5" textAnchor="middle">R(s) [Input]</text>
                    <rect x="72" y="16" width="96" height="44" rx="5" fill="#050811" stroke="#38bdf8" strokeWidth="2" />
                    <text x="120" y="43" fill="#f8fafc" fontSize="13" fontWeight="bold" textAnchor="middle">G(s)</text>
                    <line x1="168" y1="38" x2="228" y2="38" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#g-arr)" />
                    <text x="200" y="27" fill="#94a3b8" fontSize="10.5" textAnchor="middle">C(s) [Output]</text>
                  </svg>
                </div>
                <div className="component-card-desc">
                  Elemento operacional que relaciona a transformada de Laplace da saída à entrada sob condições iniciais nulas: <MathView math="C(s) = G(s) \cdot R(s)" inline />.
                </div>
                <div className="component-card-eq">
                  <MathView math="G(s) = \frac{C(s)}{R(s)} \implies C(s) = G(s) \cdot R(s)" block />
                </div>
              </div>

              {/* Componente C: Ponto de Soma */}
              <div className="component-card">
                <div className="component-card-title">
                  <span>(c) Ponto de Soma (Summing Junction)</span>
                </div>
                <div className="component-svg-box">
                  <svg viewBox="0 0 240 90">
                    {svgArrowDefs}
                    <line x1="15" y1="45" x2="75" y2="45" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#g-arr)" />
                    <text x="36" y="35" fill="#94a3b8" fontSize="10">R₁(s)</text>
                    <text x="75" y="38" fill="#38bdf8" fontSize="11">+</text>

                    <line x1="38" y1="80" x2="78" y2="57" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#g-arr)" />
                    <text x="28" y="84" fill="#94a3b8" fontSize="10">R₂(s)</text>
                    <text x="74" y="69" fill="#38bdf8" fontSize="11">+</text>

                    <line x1="94" y1="85" x2="94" y2="61" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#g-arr)" />
                    <text x="104" y="83" fill="#94a3b8" fontSize="10">R₃(s)</text>
                    <text x="100" y="67" fill="#ef4444" fontSize="11">-</text>

                    <circle cx="94" cy="45" r="14" fill="#131c2e" stroke="#38bdf8" strokeWidth="2" />
                    <line x1="84" y1="35" x2="104" y2="55" stroke="#38bdf8" strokeWidth="1.5" />
                    <line x1="84" y1="55" x2="104" y2="35" stroke="#38bdf8" strokeWidth="1.5" />

                    <line x1="108" y1="45" x2="228" y2="45" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#g-arr)" />
                    <text x="168" y="35" fill="#38bdf8" fontSize="9.5" fontWeight="bold">C(s)</text>
                  </svg>
                </div>
                <div className="component-card-desc">
                  Círculo com indicação algébrica de sinais (+ ou -). A saída é a soma linear algébrica de todas as grandezas de entrada.
                </div>
                <div className="component-card-eq">
                  <MathView math="C(s) = R_1(s) + R_2(s) - R_3(s)" block />
                </div>
              </div>

              {/* Componente D: Ponto de Ramificação */}
              <div className="component-card">
                <div className="component-card-title">
                  <span>(d) Ponto de Ramificação (Pickoff)</span>
                </div>
                <div className="component-svg-box">
                  <svg viewBox="0 0 240 85">
                    {svgArrowDefs}
                    <line x1="15" y1="42" x2="80" y2="42" stroke="#38bdf8" strokeWidth="2" />
                    <text x="42" y="32" fill="#94a3b8" fontSize="10.5" textAnchor="middle">R(s)</text>
                    <circle cx="80" cy="42" r="4" fill="#38bdf8" />

                    <line x1="80" y1="42" x2="80" y2="15" stroke="#38bdf8" strokeWidth="2" />
                    <line x1="80" y1="15" x2="220" y2="15" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#g-arr)" />
                    <text x="150" y="10" fill="#94a3b8" fontSize="10">R(s) [Ramo 1]</text>

                    <line x1="80" y1="42" x2="220" y2="42" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#g-arr)" />
                    <text x="150" y="36" fill="#94a3b8" fontSize="10">R(s) [Ramo 2]</text>

                    <line x1="80" y1="42" x2="80" y2="70" stroke="#38bdf8" strokeWidth="2" />
                    <line x1="80" y1="70" x2="220" y2="70" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#g-arr)" />
                    <text x="150" y="64" fill="#94a3b8" fontSize="10">R(s) [Ramo 3]</text>
                  </svg>
                </div>
                <div className="component-card-desc">
                  Ponto onde o mesmo sinal é distribuído concomitantemente para múltiplos caminhos paralelos ou malhas de retorno sem atenuação.
                </div>
                <div className="component-card-eq">
                  <MathView math="\text{Todos os ramos derivados} = R(s)" block />
                </div>
              </div>
            </div>

            <div className="guide-conditions-box" style={{ marginTop: '16px' }}>
              <strong>⚠️ Condição Fundamental de Desacoplamento (Hipótese de Não-Carga):</strong> O diagrama de blocos representa equações matemáticas unívocas. Na engenharia real, dois subsistemas físicos (ex.: circuitos passivos RC) só podem ser ligados diretamente como blocos se houver um circuito amplificador de isolamento (buffer com impedância de entrada infinita) entre eles, impedindo que o bloco seguinte carregue ou altere a dinâmica do bloco anterior.
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TÓPICO 2: FUNÇÃO DE TRANSFERÊNCIA
          ========================================================= */}
      {(selectedTopic === 'todos' || selectedTopic === 'ft_laplace') && (
        <div className="guide-topic-card" style={{ marginBottom: '28px' }}>
          <div className="guide-topic-title">
            <span>2. Função de Transferência & Interpretação Física</span>
          </div>
          <div className="guide-topic-body">
            <div className="guide-objective-badge">
              <b>🎯 Objetivo de Aprendizagem:</b> Compreender a definição formal de Função de Transferência como razão entre saída e entrada no domínio de Laplace com condições iniciais nulas, sua extração a partir de EDOs e o significado físico de pólos e zeros.
            </div>
            <p style={{ margin: '12px 0', color: 'var(--text-muted)' }}>
              A <b>Função de Transferência</b> <MathView math="G(s)" inline /> é o modelo matemático canônico da Engenharia de Controle para sistemas lineares e invariantes no tempo (SLIT). Ela mapeia a relação direta entre uma causa (sinal de entrada <MathView math="R(s)" inline />) e seu efeito (sinal de saída <MathView math="C(s)" inline />):
            </p>

            <div className="model-diagram-card">
              <div className="model-diagram-header">Mapeamento EDO no Tempo ⟷ Álgebra de Laplace ⟷ Bloco Funcional</div>
              <div className="guide-svg-box">
                <svg viewBox="0 0 620 110">
                  {svgArrowDefs}
                  <rect x="15" y="15" width="180" height="80" rx="6" fill="#0d1525" stroke="#1e293b" strokeWidth="1.5" />
                  <text x="105" y="38" fill="#38bdf8" fontSize="11" fontWeight="bold" textAnchor="middle">Equação Diferencial (Tempo)</text>
                  <text x="105" y="60" fill="#cbd5e1" fontSize="9.5" textAnchor="middle">a₂ c''(t) + a₁ c'(t) + a₀ c(t) =</text>
                  <text x="105" y="78" fill="#cbd5e1" fontSize="9.5" textAnchor="middle">= b₁ r'(t) + b₀ r(t)</text>

                  <line x1="195" y1="55" x2="255" y2="55" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#g-arr)" />
                  <text x="225" y="45" fill="#a855f7" fontSize="9" textAnchor="middle">ℒ &#123; C.I. = 0 &#125;</text>

                  <rect x="255" y="15" width="350" height="80" rx="6" fill="#050811" stroke="#38bdf8" strokeWidth="2" />
                  <text x="430" y="38" fill="#10b981" fontSize="11" fontWeight="bold" textAnchor="middle">Função de Transferência Racional G(s)</text>
                  <text x="430" y="62" fill="#fff" fontSize="12" fontWeight="bold" textAnchor="middle">G(s) = C(s) / R(s) = (b₁s + b₀) / (a₂s² + a₁s + a₀)</text>
                  <text x="430" y="82" fill="#94a3b8" fontSize="9.5" textAnchor="middle">Pólos: Raízes do Denominador | Zeros: Raízes do Numerador</text>
                </svg>
              </div>
            </div>

            <div className="guide-formula-box" style={{ marginTop: '16px' }}>
              <b>Definição Formal e Propriedades Relevantes:</b>
              <MathView
                math="G(s) = \frac{\mathcal{L}\{c(t)\}}{\mathcal{L}\{r(t)\}}\Bigg|_{\text{todas as C.I. } = 0} = \frac{N(s)}{D(s)} = K \frac{(s - z_1)(s - z_2)\dots(s - z_m)}{(s - p_1)(s - p_2)\dots(s - p_n)}"
                block
              />
              <ul style={{ margin: '8px 0 0 20px', color: 'var(--text-muted)' }}>
                <li><b>Pólos (<MathView math="p_i" inline />):</b> Raízes de <MathView math="D(s)=0" inline />. Determinam a <i>estabilidade</i> (todos devem ter parte real estritamente negativa <MathView math="\text{Re}(p_i) < 0" inline />) e a velocidade dos modos transitórios naturais do sistema.</li>
                <li><b>Zeros (<MathView math="z_i" inline />):</b> Raízes de <MathView math="N(s)=0" inline />. Afetam as amplitudes relativas dos modos e o sobressinal (overshoot) da resposta temporal.</li>
                <li><b>Ganho Estático (DC Gain):</b> Avaliado em <MathView math="s = 0" inline /> (<MathView math="G(0)" inline />), representa a amplificação do sistema em regime permanente para uma entrada constante em degrau.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TÓPICO 3: CASCATA (SÉRIE) & CONTRA-EXEMPLOS
          ========================================================= */}
      {(selectedTopic === 'todos' || selectedTopic === 'cascata') && (
        <div className="guide-topic-card" style={{ marginBottom: '28px' }}>
          <div className="guide-topic-title">
            <span>3. Formato em Cascata (Série) & Contra-Exemplos</span>
          </div>
          <div className="guide-topic-body">
            <div className="guide-objective-badge">
              <b>🎯 Objetivo de Aprendizagem:</b> Dominar a regra do produto em série <MathView math="G_{\text{eq}}(s) = \prod G_i(s)" inline />, identificar suas condições exatas de aplicação e reconhecer por que derivações intermediárias proíbem a fusão direta de blocos.
            </div>
            <p style={{ margin: '12px 0', color: 'var(--text-muted)' }}>
              A associação em cascata (ou série) ocorre quando a saída de um subsistema linear alimenta diretamente e com exclusividade a entrada do subsistema seguinte, sem pontos de bifurcação intermediários.
            </p>

            <div className="model-diagram-card">
              <div className="model-diagram-header">Modelo (a): Três Subsistemas Lineares em Série (Configuração Original)</div>
              <div className="guide-svg-box">
                <svg viewBox="0 0 650 95">
                  {svgArrowDefs}
                  <line x1="15" y1="50" x2="65" y2="50" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#g-arr)" />
                  <text x="35" y="38" fill="#94a3b8" fontSize="11">R(s)</text>

                  <rect x="65" y="28" width="80" height="44" rx="4" fill="#050811" stroke="#38bdf8" strokeWidth="2" />
                  <text x="105" y="55" fill="#fff" fontSize="12" fontWeight="bold" textAnchor="middle">G₁(s)</text>

                  <line x1="145" y1="50" x2="245" y2="50" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#g-arr)" />
                  <text x="195" y="36" fill="#38bdf8" fontSize="9.5" textAnchor="middle">X₂ = G₁·R</text>

                  <rect x="245" y="28" width="80" height="44" rx="4" fill="#050811" stroke="#38bdf8" strokeWidth="2" />
                  <text x="285" y="55" fill="#fff" fontSize="12" fontWeight="bold" textAnchor="middle">G₂(s)</text>

                  <line x1="325" y1="50" x2="445" y2="50" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#g-arr)" />
                  <text x="385" y="36" fill="#38bdf8" fontSize="9.5" textAnchor="middle">X₁ = G₂·G₁·R</text>

                  <rect x="445" y="28" width="80" height="44" rx="4" fill="#050811" stroke="#38bdf8" strokeWidth="2" />
                  <text x="485" y="55" fill="#fff" fontSize="12" fontWeight="bold" textAnchor="middle">G₃(s)</text>

                  <line x1="525" y1="50" x2="635" y2="50" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#g-arr)" />
                  <text x="580" y="36" fill="#10b981" fontSize="10" fontWeight="bold" textAnchor="middle">C(s) = G₃G₂G₁R(s)</text>
                </svg>
              </div>
            </div>

            <div className="model-diagram-card" style={{ marginTop: '14px' }}>
              <div className="model-diagram-header">Modelo (b): Bloco Único Equivalente Reduzido</div>
              <div className="guide-svg-box">
                <svg viewBox="0 0 450 75">
                  {svgArrowDefs}
                  <line x1="20" y1="40" x2="95" y2="40" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#g-arr)" />
                  <text x="50" y="28" fill="#94a3b8" fontSize="11">R(s)</text>
                  <rect x="95" y="18" width="230" height="44" rx="5" fill="#050811" stroke="#38bdf8" strokeWidth="2" />
                  <text x="210" y="45" fill="#38bdf8" fontSize="13" fontWeight="bold" textAnchor="middle">G₃(s) · G₂(s) · G₁(s)</text>
                  <line x1="325" y1="40" x2="425" y2="40" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#g-arr)" />
                  <text x="375" y="28" fill="#10b981" fontSize="11" fontWeight="bold">C(s)</text>
                </svg>
              </div>
            </div>

            <div className="guide-formula-box" style={{ marginTop: '14px' }}>
              <b>Dedução Matemática Completa:</b>
              <MathView
                math="G_{\text{eq}}(s) = \frac{C(s)}{R(s)} = \prod_{i=1}^{n} G_i(s) = G_3(s) \cdot G_2(s) \cdot G_1(s)"
                block
              />
            </div>

            {/* Contra-Exemplo de Cascata */}
            <div className="guide-counterexample-box" style={{ marginTop: '16px' }}>
              <strong>❌ CONTRA-EXEMPLO E ARMADILHA CLÁSSICA (Quando NÃO aplicar Cascata):</strong>
              <p style={{ margin: '6px 0' }}>Observe o diagrama abaixo onde existe um ponto de ramificação retirando o sinal <MathView math="X(s)" inline /> entre <MathView math="G_1(s)" inline /> e <MathView math="G_2(s)" inline />:</p>
              <div className="guide-svg-box" style={{ background: '#0a0812', borderColor: 'rgba(239, 68, 68, 0.4)' }}>
                <svg viewBox="0 0 520 100">
                  {svgArrowDefs}
                  <line x1="15" y1="50" x2="65" y2="50" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#g-arr)" />
                  <text x="35" y="38" fill="#94a3b8" fontSize="10.5">R(s)</text>

                  <rect x="65" y="28" width="75" height="44" rx="4" fill="#050811" stroke="#38bdf8" strokeWidth="2" />
                  <text x="102" y="55" fill="#fff" fontSize="12" fontWeight="bold" textAnchor="middle">G₁(s)</text>

                  <line x1="140" y1="50" x2="220" y2="50" stroke="#38bdf8" strokeWidth="2" />
                  <circle cx="220" cy="50" r="5" fill="#ef4444" stroke="#fff" strokeWidth="1.5" />

                  <line x1="220" y1="50" x2="220" y2="15" stroke="#ef4444" strokeWidth="2.5" />
                  <line x1="220" y1="15" x2="330" y2="15" stroke="#ef4444" strokeWidth="2.5" markerEnd="url(#g-arr-red)" />
                  <text x="345" y="19" fill="#f87171" fontSize="10" fontWeight="bold">X(s) [Ramificação Intermediária!]</text>

                  <line x1="220" y1="50" x2="300" y2="50" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#g-arr)" />

                  <rect x="300" y="28" width="75" height="44" rx="4" fill="#050811" stroke="#38bdf8" strokeWidth="2" />
                  <text x="337" y="55" fill="#fff" fontSize="12" fontWeight="bold" textAnchor="middle">G₂(s)</text>

                  <line x1="375" y1="50" x2="470" y2="50" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#g-arr)" />
                  <text x="430" y="40" fill="#10b981" fontSize="11" fontWeight="bold">C(s)</text>
                </svg>
              </div>
              <div style={{ fontSize: '0.84rem', marginTop: '8px', color: 'var(--text-muted)' }}>
                <b>Por que é proibido multiplicar <MathView math="G_1 \cdot G_2" inline /> diretamente?</b><br />
                Se fundíssemos <MathView math="G_1" inline /> e <MathView math="G_2" inline /> em um único bloco, o nó intermediário de onde <MathView math="X(s)" inline /> é retirado deixaria de existir! O sinal no ramo derivado vale <MathView math="X(s) = G_1(s) \cdot R(s)" inline />. Se substituíssemos por <MathView math="G_1 G_2" inline />, de onde sairia o sinal <MathView math="X(s)" inline />?<br />
                <b>Ação Correta:</b> Antes de aplicar a regra da cascata, é estritamente obrigatório transpor o ponto de ramificação (movendo-o para antes de <MathView math="G_1" inline /> ou depois de <MathView math="G_2" inline /> com o respectivo bloco compensador).
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TÓPICO 4: PARALELO & CONTRA-EXEMPLOS
          ========================================================= */}
      {(selectedTopic === 'todos' || selectedTopic === 'paralelo') && (
        <div className="guide-topic-card" style={{ marginBottom: '28px' }}>
          <div className="guide-topic-title">
            <span>4. Formato em Paralelo & Contra-Exemplos</span>
          </div>
          <div className="guide-topic-body">
            <div className="guide-objective-badge">
              <b>🎯 Objetivo de Aprendizagem:</b> Identificar subsistemas excitados concorrentemente pela mesma entrada e somados no mesmo ponto, aplicando a propriedade distributiva linear e distinguindo linhas visualmente paralelas de paralelos verdadeiros.
            </div>

            <div className="model-diagram-card">
              <div className="model-diagram-header">Modelo: Três Ramos em Paralelo com Somador Algébrico</div>
              <div className="guide-svg-box">
                <svg viewBox="0 0 550 170">
                  {svgArrowDefs}
                  <line x1="20" y1="85" x2="90" y2="85" stroke="#38bdf8" strokeWidth="2" />
                  <text x="45" y="75" fill="#94a3b8" fontSize="11">R(s)</text>
                  <circle cx="90" cy="85" r="4" fill="#38bdf8" />

                  {/* Ramo 1 */}
                  <line x1="90" y1="85" x2="90" y2="35" stroke="#38bdf8" strokeWidth="2" />
                  <line x1="90" y1="35" x2="160" y2="35" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#g-arr)" />
                  <rect x="160" y="15" width="85" height="40" rx="4" fill="#050811" stroke="#38bdf8" strokeWidth="2" />
                  <text x="202" y="40" fill="#fff" fontSize="12" fontWeight="bold" textAnchor="middle">G₁(s)</text>
                  <line x1="245" y1="35" x2="350" y2="35" stroke="#38bdf8" strokeWidth="2" />
                  <line x1="350" y1="35" x2="350" y2="68" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#g-arr)" />
                  <text x="358" y="62" fill="#38bdf8" fontSize="11">±</text>

                  {/* Ramo 2 */}
                  <line x1="90" y1="85" x2="160" y2="85" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#g-arr)" />
                  <rect x="160" y="65" width="85" height="40" rx="4" fill="#050811" stroke="#38bdf8" strokeWidth="2" />
                  <text x="202" y="90" fill="#fff" fontSize="12" fontWeight="bold" textAnchor="middle">G₂(s)</text>
                  <line x1="245" y1="85" x2="334" y2="85" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#g-arr)" />
                  <text x="325" y="80" fill="#38bdf8" fontSize="11">±</text>

                  {/* Ramo 3 */}
                  <line x1="90" y1="85" x2="90" y2="135" stroke="#38bdf8" strokeWidth="2" />
                  <line x1="90" y1="135" x2="160" y2="135" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#g-arr)" />
                  <rect x="160" y="115" width="85" height="40" rx="4" fill="#050811" stroke="#38bdf8" strokeWidth="2" />
                  <text x="202" y="140" fill="#fff" fontSize="12" fontWeight="bold" textAnchor="middle">G₃(s)</text>
                  <line x1="245" y1="135" x2="350" y2="135" stroke="#38bdf8" strokeWidth="2" />
                  <line x1="350" y1="135" x2="350" y2="102" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#g-arr)" />
                  <text x="358" y="118" fill="#38bdf8" fontSize="11">±</text>

                  {/* Somador central */}
                  <circle cx="350" cy="85" r="16" fill="#131c2e" stroke="#38bdf8" strokeWidth="2" />
                  <line x1="339" y1="74" x2="361" y2="96" stroke="#38bdf8" strokeWidth="1.5" />
                  <line x1="339" y1="96" x2="361" y2="74" stroke="#38bdf8" strokeWidth="1.5" />

                  <line x1="366" y1="85" x2="520" y2="85" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#g-arr)" />
                  <text x="440" y="75" fill="#10b981" fontSize="10" fontWeight="bold" textAnchor="middle">C(s) = [±G₁ ±G₂ ±G₃]R(s)</text>
                </svg>
              </div>
            </div>

            <div className="guide-formula-box" style={{ marginTop: '14px' }}>
              <b>Dedução Matemática:</b>
              <MathView
                math="G_{\text{eq}}(s) = \frac{C(s)}{R(s)} = \pm G_1(s) \pm G_2(s) \pm G_3(s) = \frac{N_1 D_2 \pm N_2 D_1}{D_1 D_2}"
                block
              />
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TÓPICO 5: MALHA FECHADA & DEDUÇÃO
          ========================================================= */}
      {(selectedTopic === 'todos' || selectedTopic === 'malha_fechada') && (
        <div className="guide-topic-card" style={{ marginBottom: '28px' }}>
          <div className="guide-topic-title">
            <span>5. Formato Canônico em Malha Fechada (Feedback)</span>
          </div>
          <div className="guide-topic-body">
            <div className="guide-objective-badge">
              <b>🎯 Objetivo de Aprendizagem:</b> Dominar a estrutura canônica de malha fechada com realimentação, deduzir algebricamente a fórmula canônica em 6 etapas e justificar a inversão de sinal no denominador.
            </div>

            <div className="model-diagram-card">
              <div className="model-diagram-header">Modelo Canônico de Controle com Realimentação</div>
              <div className="guide-svg-box">
                <svg viewBox="0 0 540 180">
                  {svgArrowDefs}
                  <line x1="20" y1="65" x2="85" y2="65" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#g-arr)" />
                  <text x="45" y="55" fill="#94a3b8" fontSize="11">R(s) [Input]</text>

                  <circle cx="100" cy="65" r="15" fill="#131c2e" stroke="#38bdf8" strokeWidth="2" />
                  <text x="88" y="62" fill="#38bdf8" fontSize="11">+</text>
                  <text x="96" y="80" fill="#ef4444" fontSize="12" fontWeight="bold">∓</text>

                  <line x1="115" y1="65" x2="195" y2="65" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#g-arr)" />
                  <text x="155" y="55" fill="#fbbf24" fontSize="10.5" fontWeight="bold">E(s) [Erro]</text>

                  <rect x="195" y="43" width="95" height="44" rx="5" fill="#050811" stroke="#38bdf8" strokeWidth="2" />
                  <text x="242" y="70" fill="#fff" fontSize="13" fontWeight="bold" textAnchor="middle">G(s)</text>

                  <line x1="290" y1="65" x2="490" y2="65" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#g-arr)" />
                  <text x="450" y="55" fill="#10b981" fontSize="11" fontWeight="bold">C(s) [Output]</text>

                  <circle cx="380" cy="65" r="4" fill="#38bdf8" />
                  <line x1="380" y1="65" x2="380" y2="135" stroke="#38bdf8" strokeWidth="2" />
                  <line x1="380" y1="135" x2="290" y2="135" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#g-arr)" />

                  <rect x="195" y="113" width="95" height="44" rx="5" fill="#050811" stroke="#a855f7" strokeWidth="2" />
                  <text x="242" y="140" fill="#fff" fontSize="13" fontWeight="bold" textAnchor="middle">H(s)</text>

                  <line x1="195" y1="135" x2="100" y2="135" stroke="#38bdf8" strokeWidth="2" />
                  <line x1="100" y1="135" x2="100" y2="82" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#g-arr)" />
                </svg>
              </div>
            </div>

            <div className="guide-formula-box" style={{ marginTop: '16px' }}>
              <b>Dedução Analítica Rigorosa em 6 Passos Fundamentais:</b>
              <ol style={{ margin: '6px 0 6px 20px', color: 'var(--text)' }}>
                <li><b>Equação nodal de erro:</b> <MathView math="E(s) = R(s) \mp B(s)" inline /></li>
                <li><b>Relação de realimentação do sensor:</b> <MathView math="B(s) = H(s) \cdot C(s)" inline /></li>
                <li><b>Relação da planta direta:</b> <MathView math="C(s) = G(s) \cdot E(s)" inline /></li>
                <li><b>Substituição algébrica:</b> <MathView math="C(s) = G(s)[R(s) \mp H(s)C(s)] = G(s)R(s) \mp G(s)H(s)C(s)" inline /></li>
                <li><b>Agrupamento dos termos em C(s):</b> <MathView math="C(s) \cdot [1 \pm G(s)H(s)] = G(s)R(s)" inline /></li>
                <li><b>Isolamento da razão T(s) = C(s)/R(s):</b>
                  <MathView math="T(s) = \frac{C(s)}{R(s)} = \frac{G(s)}{1 \pm G(s)H(s)}" block />
                </li>
              </ol>
            </div>

            <div className="rule-explanation-box" style={{ marginTop: '14px' }}>
              <b>🎯 Por que o sinal de realimentação negativa (–) gera sinal POSITIVO (+) no denominador?</b><br />
              Na realimentação negativa, o somador opera como <MathView math="E = R - B = R - HC" inline />. Ao distribuir a planta <MathView math="G" inline />, obtemos o termo <MathView math="-GHC" inline />. Para isolar <MathView math="C" inline />, esse termo é transposto para o primeiro membro da equação somando (<MathView math="+GHC" inline />), gerando o fator canônico <MathView math="1 + G(s)H(s)" inline />.<br />
              • <b>Realimentação Negativa (– no somador):</b> Denominador <MathView math="1 + G(s)H(s)" inline /> (estabiliza o sistema e reduz o erro de regime).<br />
              • <b>Realimentação Positiva (+ no somador):</b> Denominador <MathView math="1 - G(s)H(s)" inline /> (tende à instabilidade).
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TÓPICO 6: MOVENDO BLOCOS E NÓS
          ========================================================= */}
      {(selectedTopic === 'todos' || selectedTopic === 'movendo_blocos') && (
        <div className="guide-topic-card" style={{ marginBottom: '28px' }}>
          <div className="guide-topic-title">
            <span>6. Movendo Blocos e Ramificações (Regras de Transposição Equivalente)</span>
          </div>
          <div className="guide-topic-body">
            <div className="guide-objective-badge">
              <b>🎯 Objetivo de Aprendizagem:</b> Dominar as 4 regras fundamentais de transposição de nós de ramificação e pontos de soma através de blocos, preservando com exatidão os sinais nodais em todas as ramificações.
            </div>

            {/* Regra 1: Mover Ramificação para DEPOIS do Bloco */}
            <div className="rule-comparison-card" style={{ marginTop: '16px' }}>
              <div className="rule-comparison-header">
                <span>Regra 1: Mover Ponto de Ramificação para DEPOIS de um Bloco G(s)</span>
              </div>
              <div className="rule-comparison-grid">
                <div className="rule-side-box">
                  <div className="rule-side-label"><span>Configuração Original (Antes)</span></div>
                  <div className="rule-side-svg">
                    <svg viewBox="0 0 280 110">
                      {svgArrowDefs}
                      <line x1="15" y1="55" x2="70" y2="55" stroke="#38bdf8" strokeWidth="2" />
                      <text x="40" y="45" fill="#94a3b8" fontSize="11">R(s)</text>
                      <circle cx="70" cy="55" r="4" fill="#38bdf8" />
                      
                      <line x1="70" y1="55" x2="70" y2="25" stroke="#38bdf8" strokeWidth="2" />
                      <line x1="70" y1="25" x2="110" y2="25" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#g-arr)" />
                      <rect x="110" y="8" width="65" height="34" rx="4" fill="#050811" stroke="#38bdf8" strokeWidth="2" />
                      <text x="142" y="30" fill="#fff" fontSize="11" fontWeight="bold" textAnchor="middle">G(s)</text>
                      <line x1="175" y1="25" x2="265" y2="25" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#g-arr)" />
                      <text x="220" y="18" fill="#10b981" fontSize="10">R(s)G(s)</text>
                      
                      <line x1="70" y1="55" x2="265" y2="55" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#g-arr)" />
                      <text x="220" y="48" fill="#94a3b8" fontSize="10">R(s)</text>
                      
                      <line x1="70" y1="55" x2="70" y2="85" stroke="#38bdf8" strokeWidth="2" />
                      <line x1="70" y1="85" x2="265" y2="85" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#g-arr)" />
                      <text x="220" y="78" fill="#94a3b8" fontSize="10">R(s)</text>
                    </svg>
                  </div>
                </div>
                <div className="rule-equiv-sign">≡</div>
                <div className="rule-side-box">
                  <div className="rule-side-label"><span>Configuração Equivalente (Depois)</span></div>
                  <div className="rule-side-svg">
                    <svg viewBox="0 0 280 110">
                      {svgArrowDefs}
                      <line x1="15" y1="55" x2="65" y2="55" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#g-arr)" />
                      <text x="40" y="45" fill="#94a3b8" fontSize="11">R(s)</text>
                      <rect x="65" y="38" width="60" height="34" rx="4" fill="#050811" stroke="#38bdf8" strokeWidth="2" />
                      <text x="95" y="60" fill="#fff" fontSize="11" fontWeight="bold" textAnchor="middle">G(s)</text>
                      
                      <line x1="125" y1="55" x2="165" y2="55" stroke="#38bdf8" strokeWidth="2" />
                      <circle cx="165" cy="55" r="4" fill="#38bdf8" />
                      
                      <line x1="165" y1="55" x2="265" y2="25" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#g-arr)" />
                      <text x="215" y="18" fill="#10b981" fontSize="10">R(s)G(s)</text>
                      
                      <line x1="165" y1="55" x2="185" y2="55" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#g-arr)" />
                      <rect x="185" y="40" width="55" height="30" rx="4" fill="#050811" stroke="#a855f7" strokeWidth="2" />
                      <text x="212" y="60" fill="#f8fafc" fontSize="10" fontWeight="bold" textAnchor="middle">1/G(s)</text>
                      <line x1="240" y1="55" x2="270" y2="55" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#g-arr)" />
                      <text x="255" y="47" fill="#94a3b8" fontSize="9.5">R(s)</text>
                      
                      <line x1="165" y1="55" x2="165" y2="88" stroke="#38bdf8" strokeWidth="2" />
                      <line x1="165" y1="88" x2="185" y2="88" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#g-arr)" />
                      <rect x="185" y="73" width="55" height="30" rx="4" fill="#050811" stroke="#a855f7" strokeWidth="2" />
                      <text x="212" y="93" fill="#f8fafc" fontSize="10" fontWeight="bold" textAnchor="middle">1/G(s)</text>
                      <line x1="240" y1="88" x2="270" y2="88" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#g-arr)" />
                      <text x="255" y="80" fill="#94a3b8" fontSize="9.5">R(s)</text>
                    </svg>
                  </div>
                </div>
              </div>
              <div className="rule-explanation-box">
                <b>Justificativa Matemática:</b> Ao mover o ponto de derivação para depois de <MathView math="G(s)" inline />, o sinal disponível no nó passa a ser <MathView math="R(s) \cdot G(s)" inline />. Para restaurar a grandeza original <MathView math="R(s)" inline />, cada ramo derivado secundário deve receber um bloco com ganho inverso <MathView math="\frac{1}{G(s)}" inline />, pois <MathView math="[R(s)G(s)] \cdot \frac{1}{G(s)} = R(s)" inline />.
              </div>
            </div>

            {/* Regra 2: Mover Somador para DEPOIS do Bloco */}
            <div className="rule-comparison-card" style={{ marginTop: '16px' }}>
              <div className="rule-comparison-header">
                <span>Regra 2: Mover Ponto de Soma para DEPOIS de um Bloco G(s)</span>
              </div>
              <div className="rule-comparison-grid">
                <div className="rule-side-box">
                  <div className="rule-side-label"><span>Configuração Original (Antes)</span></div>
                  <div className="rule-side-svg">
                    <svg viewBox="0 0 280 90">
                      {svgArrowDefs}
                      <line x1="15" y1="45" x2="65" y2="45" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#g-arr)" />
                      <text x="35" y="35" fill="#94a3b8" fontSize="10.5">R(s)</text>
                      <text x="65" y="38" fill="#38bdf8" fontSize="11">+</text>

                      <line x1="80" y1="80" x2="80" y2="59" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#g-arr)" />
                      <text x="88" y="78" fill="#94a3b8" fontSize="10.5">X(s)</text>
                      <text x="86" y="65" fill="#38bdf8" fontSize="11">±</text>

                      <circle cx="80" cy="45" r="14" fill="#131c2e" stroke="#38bdf8" strokeWidth="2" />
                      <line x1="94" y1="45" x2="145" y2="45" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#g-arr)" />
                      <rect x="145" y="27" width="55" height="36" rx="4" fill="#050811" stroke="#38bdf8" strokeWidth="2" />
                      <text x="172" y="50" fill="#fff" fontSize="11" fontWeight="bold" textAnchor="middle">G(s)</text>
                      
                      <line x1="200" y1="45" x2="265" y2="45" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#g-arr)" />
                      <text x="232" y="35" fill="#10b981" fontSize="9.5" textAnchor="middle">C = (R ± X)G</text>
                    </svg>
                  </div>
                </div>
                <div className="rule-equiv-sign">≡</div>
                <div className="rule-side-box">
                  <div className="rule-side-label"><span>Configuração Equivalente (Depois)</span></div>
                  <div className="rule-side-svg">
                    <svg viewBox="0 0 280 90">
                      {svgArrowDefs}
                      <line x1="15" y1="28" x2="65" y2="28" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#g-arr)" />
                      <text x="35" y="20" fill="#94a3b8" fontSize="10.5">R(s)</text>
                      <rect x="65" y="12" width="55" height="32" rx="4" fill="#050811" stroke="#38bdf8" strokeWidth="2" />
                      <text x="92" y="32" fill="#fff" fontSize="10.5" fontWeight="bold" textAnchor="middle">G(s)</text>

                      <line x1="15" y1="68" x2="65" y2="68" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#g-arr)" />
                      <text x="35" y="60" fill="#94a3b8" fontSize="10.5">X(s)</text>
                      <rect x="65" y="52" width="55" height="32" rx="4" fill="#050811" stroke="#38bdf8" strokeWidth="2" />
                      <text x="92" y="72" fill="#fff" fontSize="10.5" fontWeight="bold" textAnchor="middle">G(s)</text>

                      <line x1="120" y1="28" x2="165" y2="28" stroke="#38bdf8" strokeWidth="2" />
                      <line x1="165" y1="28" x2="165" y2="35" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#g-arr)" />

                      <line x1="120" y1="68" x2="165" y2="68" stroke="#38bdf8" strokeWidth="2" />
                      <line x1="165" y1="68" x2="165" y2="61" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#g-arr)" />

                      <circle cx="165" cy="48" r="13" fill="#131c2e" stroke="#38bdf8" strokeWidth="2" />
                      <line x1="178" y1="48" x2="265" y2="48" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#g-arr)" />
                      <text x="220" y="38" fill="#10b981" fontSize="9.5" textAnchor="middle">C = R·G ± X·G</text>
                    </svg>
                  </div>
                </div>
              </div>
              <div className="rule-explanation-box">
                <b>Justificativa Matemática:</b> Como a saída original é <MathView math="C(s) = [R(s) \pm X(s)] \cdot G(s) = R(s)G(s) \pm X(s)G(s)" inline />, ao deslocar o somador para depois de <MathView math="G(s)" inline />, cada sinal que entra no somador deve ter passado previamente por um bloco <MathView math="G(s)" inline />.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TÓPICO 7: ESTRATÉGIA SISTEMÁTICA DE REDUÇÃO
          ========================================================= */}
      {(selectedTopic === 'todos' || selectedTopic === 'estrategia') && (
        <div className="guide-topic-card" style={{ marginBottom: '28px' }}>
          <div className="guide-topic-title">
            <span>7. Estratégia Sistemática de Redução em 4 Fases</span>
          </div>
          <div className="guide-topic-body">
            <div className="guide-objective-badge">
              <b>🎯 Objetivo de Aprendizagem:</b> Executar uma sequência metodológica em 4 fases para resolver qualquer diagrama de blocos complexo, evitando redundâncias e impasses algébricos.
            </div>

            <div className="heuristic-phase-grid" style={{ marginTop: '16px' }}>
              <div className="heuristic-phase-card">
                <div className="phase-header">
                  <span className="phase-num">1</span>
                  <span>Reduções Diretas Óbvias</span>
                </div>
                <p style={{ fontSize: '0.84rem', margin: 0, color: 'var(--text-muted)' }}>
                  Procure blocos em série direta (sem derivações intermediárias) e aplique cascata (<MathView math="G_1 G_2" inline />). Procure blocos em paralelo puro com o mesmo nó e unifique (<MathView math="G_1 \pm G_2" inline />).
                </p>
              </div>

              <div className="heuristic-phase-card">
                <div className="phase-header">
                  <span className="phase-num">2</span>
                  <span>Malhas Internas Fechadas</span>
                </div>
                <p style={{ fontSize: '0.84rem', margin: 0, color: 'var(--text-muted)' }}>
                  Localize laços de realimentação fechados menores (aninhados) que estejam livres de ramificações secundárias. Reduza-os imediatamente pela fórmula canônica <MathView math="\frac{G}{1 \pm GH}" inline />.
                </p>
              </div>

              <div className="heuristic-phase-card">
                <div className="phase-header">
                  <span className="phase-num">3</span>
                  <span>Desembaraçar Malhas Cruzadas</span>
                </div>
                <p style={{ fontSize: '0.84rem', margin: 0, color: 'var(--text-muted)' }}>
                  Se duas malhas estiverem entrelaçadas, mova um ponto de ramificação para <b>depois</b> do bloco da frente (inserindo <MathView math="1/G" inline />). Isso separa os laços e revela uma nova malha interna isolada!
                </p>
              </div>

              <div className="heuristic-phase-card">
                <div className="phase-header">
                  <span className="phase-num">4</span>
                  <span>Malha Principal e MMC Racional</span>
                </div>
                <p style={{ fontSize: '0.84rem', margin: 0, color: 'var(--text-muted)' }}>
                  Feche a última malha externa canônica. Realize o produto e a soma com MMC entre os polinômios do numerador e denominador, cancelando fatores comuns para obter a Função de Transferência final em bloco único.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TÓPICO 8: ÁLGEBRA E MMC
          ========================================================= */}
      {(selectedTopic === 'todos' || selectedTopic === 'matematica_base') && (
        <div className="guide-topic-card" style={{ marginBottom: '28px' }}>
          <div className="guide-topic-title">
            <span>8. Matemática Base: MMC de Polinômios, Frações Racionais e Cortes</span>
          </div>
          <div className="guide-topic-body">
            <div className="guide-objective-badge">
              <b>🎯 Objetivo de Aprendizagem:</b> Manipular algebricamente razões de polinômios em s, calcular o Mínimo Múltiplo Comum (MMC), inverter frações e cancelar fatores comuns sem cometer erros algébricos elementares.
            </div>

            <div className="guide-formula-box" style={{ marginTop: '16px' }}>
              <b>Algoritmo Analítico com Mínimo Múltiplo Comum (MMC):</b>
              <ol style={{ margin: '6px 0 6px 20px', color: 'var(--text)' }}>
                <li><b>Produto de malha:</b> <MathView math="G(s)H(s) = \frac{N_G(s)N_H(s)}{D_G(s)D_H(s)}" inline /></li>
                <li><b>MMC com a unidade:</b>
                  <MathView math="1 \pm G(s)H(s) = \frac{D_G(s)D_H(s) \pm N_G(s)N_H(s)}{D_G(s)D_H(s)}" block />
                </li>
                <li><b>Divisão de frações (inversão da fração inferior):</b>
                  <MathView math="T(s) = \frac{\frac{N_G}{D_G}}{\frac{D_G D_H \pm N_G N_H}{D_G D_H}} = \frac{N_G(s)}{D_G(s)} \cdot \frac{D_G(s)D_H(s)}{D_G(s)D_H(s) \pm N_G(s)N_H(s)}" block />
                </li>
                <li><b>Cancelamento de <MathView math="D_G(s)" inline />:</b>
                  <MathView math="T(s) = \mathbf{\frac{N_G(s) \cdot D_H(s)}{D_G(s)D_H(s) \pm N_G(s)N_H(s)}}" block />
                </li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TÓPICO 9: QUIZ DE FIXAÇÃO
          ========================================================= */}
      {(selectedTopic === 'todos' || selectedTopic === 'quiz_fixacao') && (
        <div className="guide-topic-card" style={{ marginBottom: '28px' }}>
          <div className="guide-topic-title">
            <span>9. Laboratório de Fixação Conceitual & Diagnóstico de Erros</span>
          </div>
          <div className="guide-topic-body">
            <div className="guide-objective-badge">
              <b>🎯 Objetivo de Aprendizagem:</b> Avaliar seu próprio entendimento das condições de contorno e regras de transposição, identificando contra-exemplos típicos e consolidando o raciocínio analítico.
            </div>

            <div className="guide-quiz-container" style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Desafio 1 */}
              <div className="guide-quiz-card">
                <div className="question-title" style={{ fontSize: '0.96rem', fontWeight: 700, color: 'var(--text)', marginBottom: '10px' }}>
                  <span style={{ color: 'var(--primary)' }}>Desafio 1:</span> Dois blocos <MathView math="G_1(s)" inline /> e <MathView math="G_2(s)" inline /> estão dispostos em sequência na linha direta, mas entre eles existe um ponto de ramificação que alimenta uma malha externa. Podemos substituí-los imediatamente pelo bloco <MathView math="G_{\text{eq}}(s) = G_1(s) \cdot G_2(s)" inline />?
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    type="button"
                    className={`filter-btn ${quizAnswers.q1?.opt === 'A' ? 'active' : ''}`}
                    onClick={() => handleQuizSelect('q1', 'A', true)}
                    style={{ textAlign: 'left', padding: '10px 14px' }}
                  >
                    (A) Não. É obrigatório transpor o ponto de ramificação antes de associar os blocos em cascata, sob pena de eliminar um sinal nodal intermediário.
                  </button>
                  <button
                    type="button"
                    className={`filter-btn ${quizAnswers.q1?.opt === 'B' ? 'active' : ''}`}
                    onClick={() => handleQuizSelect('q1', 'B', false)}
                    style={{ textAlign: 'left', padding: '10px 14px' }}
                  >
                    (B) Sim. Quaisquer dois blocos dispostos em sequência direta podem ser multiplicados livremente.
                  </button>
                  <button
                    type="button"
                    className={`filter-btn ${quizAnswers.q1?.opt === 'C' ? 'active' : ''}`}
                    onClick={() => handleQuizSelect('q1', 'C', false)}
                    style={{ textAlign: 'left', padding: '10px 14px' }}
                  >
                    (C) Sim, desde que a malha externa possua realimentação unitária (H=1).
                  </button>
                </div>
                {quizAnswers.q1 && (
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      background: quizAnswers.q1.isCorrect ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      border: `1px solid ${quizAnswers.q1.isCorrect ? 'var(--success)' : 'var(--danger)'}`,
                      fontSize: '0.86rem',
                      color: 'var(--text)'
                    }}
                  >
                    <b>{quizAnswers.q1.isCorrect ? '✅ Resposta Correta!' : '❌ Incorreto!'}</b><br />
                    A ramificação intermediária retira um sinal nodal <MathView math="X(s) = G_1(s)R(s)" inline /> indispensável para o restante do diagrama. Se fundíssemos <MathView math="G_1" inline /> e <MathView math="G_2" inline /> diretamente em cascata, esse nó intermediário desapareceria. É obrigatório transpor o ponto de ramificação para antes de <MathView math="G_1" inline /> ou depois de <MathView math="G_2" inline /> antes de aplicar a regra da cascata.
                  </div>
                )}
              </div>

              {/* Desafio 2 */}
              <div className="guide-quiz-card">
                <div className="question-title" style={{ fontSize: '0.96rem', fontWeight: 700, color: 'var(--text)', marginBottom: '10px' }}>
                  <span style={{ color: 'var(--primary)' }}>Desafio 2:</span> Em uma malha fechada canônica com caminho direto <MathView math="G(s)" inline /> e retorno <MathView math="H(s)" inline />, o ponto de soma possui sinal negativo (–) no ramo de realimentação. Qual é o sinal no denominador da Função de Transferência equivalente <MathView math="T(s) = \frac{C(s)}{R(s)}" inline />?
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    type="button"
                    className={`filter-btn ${quizAnswers.q2?.opt === 'A' ? 'active' : ''}`}
                    onClick={() => handleQuizSelect('q2', 'A', true)}
                    style={{ textAlign: 'left', padding: '10px 14px' }}
                  >
                    (A) Sinal positivo (1 + G(s)H(s)), pois a transposição do termo -G(s)H(s)C(s) para o membro esquerdo da equação inverte o sinal para adição (+).
                  </button>
                  <button
                    type="button"
                    className={`filter-btn ${quizAnswers.q2?.opt === 'B' ? 'active' : ''}`}
                    onClick={() => handleQuizSelect('q2', 'B', false)}
                    style={{ textAlign: 'left', padding: '10px 14px' }}
                  >
                    (B) Sinal negativo (1 - G(s)H(s)), pois o sinal do denominador deve ser sempre idêntico ao sinal físico do somador.
                  </button>
                </div>
                {quizAnswers.q2 && (
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      background: quizAnswers.q2.isCorrect ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      border: `1px solid ${quizAnswers.q2.isCorrect ? 'var(--success)' : 'var(--danger)'}`,
                      fontSize: '0.86rem',
                      color: 'var(--text)'
                    }}
                  >
                    <b>{quizAnswers.q2.isCorrect ? '✅ Resposta Correta!' : '❌ Incorreto!'}</b><br />
                    A realimentação negativa atua como <MathView math="E = R - B" inline />. Ao isolar a saída <MathView math="C" inline />, o termo <MathView math="-GH \cdot C" inline /> passa para o membro esquerdo da equação somando (<MathView math="+GH \cdot C" inline />), gerando o fator canônico <MathView math="1 + G(s)H(s)" inline />.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
