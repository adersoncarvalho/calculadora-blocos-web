'use client';

import React from 'react';

interface PresetSvgViewProps {
  presetKey: string;
  values: Record<string, string>;
  stageIndex?: number;
}

export const PresetSvgView: React.FC<PresetSvgViewProps> = ({
  presetKey,
  values,
  stageIndex = 0
}) => {
  const gVal = values.G || values.G1 || 'G(s)';
  const hVal = values.H || values.H1 || 'H(s)';
  const g1Val = values.G1 || 'G_1(s)';
  const g2Val = values.G2 || 'G_2(s)';
  const g3Val = values.G3 || 'G_3(s)';
  const isNegative = (values.sinal || 'Negativa (-)').includes('Negativa');
  const isSub = (values.op || 'Adição (+)').includes('Subtração');
  const denOp = isNegative ? '+' : '-';

  // Definições de marcadores de setas compartilhados
  const defs = (
    <defs>
      <marker id="arrow-blue" viewBox="0 0 10 10" refX="7.5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1 L 9 5 L 0 9 z" fill="#38bdf8" />
      </marker>
      <marker id="arrow-purple" viewBox="0 0 10 10" refX="7.5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1 L 9 5 L 0 9 z" fill="#a855f7" />
      </marker>
      <marker id="arrow-green" viewBox="0 0 10 10" refX="7.5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1 L 9 5 L 0 9 z" fill="#10b981" />
      </marker>
      <marker id="arrow-amber" viewBox="0 0 10 10" refX="7.5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1 L 9 5 L 0 9 z" fill="#f59e0b" />
      </marker>
    </defs>
  );

  // =========================================================================
  // 1. MALHA FECHADA PADRÃO
  // =========================================================================
  if (presetKey === 'mf_padrao') {
    if (stageIndex === 1) {
      // Etapa 2: Substituição de E(s) = R(s) - C(s)H(s) no bloco direto G(s)
      return (
        <svg viewBox="0 0 760 180" width="100%" height="180" style={{ background: '#050811', borderRadius: 8 }}>
          {defs}
          <text x="380" y="24" textAnchor="middle" fill="#f59e0b" fontSize="11" fontWeight="bold">
            Etapa 2: Substituição de E(s) = R(s) {isNegative ? '-' : '+'} C(s)H(s) no bloco G(s)
          </text>
          <rect x="130" y="45" width="460" height="120" rx="8" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="5,5" />
          <line x1="40" y1="90" x2="160" y2="90" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow-blue)" />
          <text x="70" y="80" fill="#94a3b8" fontSize="11" fontWeight="bold">R(s)</text>
          <circle cx="180" cy="90" r="16" fill="#131c2e" stroke="#f59e0b" strokeWidth="2" />
          <text x="168" y="86" fill="#38bdf8" fontSize="11">+</text>
          <text x="176" y="104" fill={isNegative ? '#ef4444' : '#10b981'} fontSize="12" fontWeight="bold">{isNegative ? '-' : '+'}</text>
          <line x1="196" y1="90" x2="300" y2="90" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow-blue)" />
          <text x="210" y="78" fill="#fbbf24" fontSize="10">R(s) {isNegative ? '-' : '+'} C(s)H(s)</text>
          <rect x="300" y="65" width="180" height="50" rx="6" fill="#131c2e" stroke="#f59e0b" strokeWidth="2" />
          <text x="390" y="95" fill="#f8fafc" fontSize="12" fontWeight="bold" textAnchor="middle">{gVal}</text>
          <line x1="480" y1="90" x2="680" y2="90" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow-blue)" />
          <text x="640" y="80" fill="#94a3b8" fontSize="11" fontWeight="bold">C(s)</text>
          <circle cx="560" cy="90" r="4" fill="#a855f7" />
          <line x1="560" y1="90" x2="560" y2="145" stroke="#a855f7" strokeWidth="2" />
          <line x1="560" y1="145" x2="180" y2="145" stroke="#a855f7" strokeWidth="2" />
          <text x="370" y="140" textAnchor="middle" fill="#c084fc" fontSize="10">Sinal Retornado: C(s) · H(s)</text>
          <line x1="180" y1="145" x2="180" y2="106" stroke="#a855f7" strokeWidth="2" markerEnd="url(#arrow-purple)" />
        </svg>
      );
    }

    if (stageIndex === 2 || stageIndex === 3) {
      // Etapa 3/4: Bloco Único Equivalente Reduzido T(s) = G/(1 ± GH)
      return (
        <svg viewBox="0 0 760 180" width="100%" height="180" style={{ background: '#050811', borderRadius: 8 }}>
          {defs}
          <text x="380" y="26" textAnchor="middle" fill="#10b981" fontSize="11" fontWeight="bold">
            Etapa {stageIndex + 1}: Diagrama Reduzido em Bloco Único Equivalente T(s) = C(s)/R(s)
          </text>
          <line x1="50" y1="100" x2="220" y2="100" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow-blue)" />
          <text x="80" y="90" fill="#94a3b8" fontSize="11" fontWeight="bold">R(s)</text>
          <rect x="220" y="65" width="320" height="70" rx="8" fill="#131c2e" stroke="#10b981" strokeWidth="2" />
          <text x="380" y="92" textAnchor="middle" fill="#38bdf8" fontSize="12" fontWeight="bold">G(s)</text>
          <line x1="250" y1="100" x2="510" y2="100" stroke="#64748b" strokeWidth="1.5" />
          <text x="380" y="122" textAnchor="middle" fill="#f8fafc" fontSize="12" fontWeight="bold">
            1 {denOp} G(s) · H(s)
          </text>
          <line x1="540" y1="100" x2="710" y2="100" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow-blue)" />
          <text x="680" y="90" fill="#94a3b8" fontSize="11" fontWeight="bold">C(s)</text>
        </svg>
      );
    }

    // Etapa 0 / Original: Diagrama Canônico com Somador
    return (
      <svg viewBox="0 0 760 180" width="100%" height="180" style={{ background: '#050811', borderRadius: 8 }}>
        {defs}
        <text x="380" y="22" textAnchor="middle" fill="#38bdf8" fontSize="11" fontWeight="bold">
          Etapa 1: Diagrama Canônico Original com Caminho Direto e Sensor de Retorno
        </text>
        <line x1="40" y1="75" x2="130" y2="75" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow-blue)" />
        <text x="60" y="65" fill="#94a3b8" fontSize="11" fontWeight="bold">R(s)</text>
        <circle cx="150" cy="75" r="16" fill="#0d1424" stroke="#38bdf8" strokeWidth="2" />
        <text x="138" y="71" fill="#38bdf8" fontSize="11">+</text>
        <text x="146" y="89" fill={isNegative ? '#ef4444' : '#10b981'} fontSize="11">{isNegative ? '-' : '+'}</text>
        <line x1="166" y1="75" x2="250" y2="75" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow-blue)" />
        <text x="190" y="65" fill="#fbbf24" fontSize="10.5">E(s)</text>
        <rect x="250" y="49" width="180" height="52" rx="6" fill="#131c2e" stroke="#38bdf8" strokeWidth="2" />
        <text x="340" y="79" fill="#f8fafc" fontSize="12" fontWeight="bold" textAnchor="middle">{gVal}</text>
        <line x1="430" y1="75" x2="600" y2="75" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow-blue)" />
        <text x="560" y="65" fill="#94a3b8" fontSize="11" fontWeight="bold">C(s)</text>
        <circle cx="500" cy="75" r="4" fill="#38bdf8" />
        <line x1="500" y1="75" x2="500" y2="140" stroke="#38bdf8" strokeWidth="2" />
        <line x1="500" y1="140" x2="430" y2="140" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow-blue)" />
        <rect x="250" y="115" width="180" height="50" rx="6" fill="#131c2e" stroke="#a855f7" strokeWidth="2" />
        <text x="340" y="145" fill="#f8fafc" fontSize="12" fontWeight="bold" textAnchor="middle">{hVal}</text>
        <line x1="250" y1="140" x2="150" y2="140" stroke="#38bdf8" strokeWidth="2" />
        <line x1="150" y1="140" x2="150" y2="91" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow-blue)" />
      </svg>
    );
  }

  // =========================================================================
  // 2. ASSOCIAÇÃO EM CASCATA / SÉRIE (cascata_dupla, exemplo1, exemplo2)
  // =========================================================================
  if (presetKey === 'cascata_dupla' || presetKey === 'exemplo1' || presetKey === 'exemplo2') {
    const isTriple = presetKey === 'exemplo1';

    if (stageIndex >= 1) {
      // Bloco Único Reduzido
      return (
        <svg viewBox="0 0 760 140" width="100%" height="140" style={{ background: '#050811', borderRadius: 8 }}>
          {defs}
          <text x="380" y="24" textAnchor="middle" fill="#10b981" fontSize="11" fontWeight="bold">
            Etapa Final: Bloco Único Equivalente G_eq(s) = {isTriple ? 'K · G2 · G3' : 'G1(s) · G2(s)'}
          </text>
          <line x1="50" y1="80" x2="230" y2="80" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow-blue)" />
          <text x="80" y="70" fill="#94a3b8" fontSize="11" fontWeight="bold">R(s)</text>
          <rect x="230" y="54" width="300" height="52" rx="6" fill="#131c2e" stroke="#10b981" strokeWidth="2" />
          <text x="380" y="84" fill="#f8fafc" fontSize="12" fontWeight="bold" textAnchor="middle">
            {isTriple ? `${g1Val} · (${g2Val}) · (${g3Val})` : `${g1Val} · (${g2Val})`}
          </text>
          <line x1="530" y1="80" x2="710" y2="80" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow-blue)" />
          <text x="680" y="70" fill="#94a3b8" fontSize="11" fontWeight="bold">C(s)</text>
        </svg>
      );
    }

    return (
      <svg viewBox="0 0 760 140" width="100%" height="140" style={{ background: '#050811', borderRadius: 8 }}>
        {defs}
        <text x="380" y="20" textAnchor="middle" fill="#f59e0b" fontSize="10.5" fontWeight="bold">
          Etapa 1: Formato em Cascata (Série) com Sinais Intermediários
        </text>
        <line x1="30" y1="75" x2="110" y2="75" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow-blue)" />
        <text x="50" y="65" fill="#94a3b8" fontSize="11" fontWeight="bold">R(s)</text>
        <rect x="110" y="49" width="130" height="52" rx="6" fill="#131c2e" stroke="#38bdf8" strokeWidth="2" />
        <text x="175" y="79" fill="#f8fafc" fontSize="12" fontWeight="bold" textAnchor="middle">{g1Val}</text>
        <line x1="240" y1="75" x2="330" y2="75" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow-blue)" />
        <text x="285" y="65" textAnchor="middle" fill="#fbbf24" fontSize="10.5" fontWeight="bold">X1(s)</text>
        <rect x="330" y="49" width="130" height="52" rx="6" fill="#131c2e" stroke="#38bdf8" strokeWidth="2" />
        <text x="395" y="79" fill="#f8fafc" fontSize="12" fontWeight="bold" textAnchor="middle">{g2Val}</text>

        {isTriple ? (
          <>
            <line x1="460" y1="75" x2="540" y2="75" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow-blue)" />
            <text x="500" y="65" textAnchor="middle" fill="#fbbf24" fontSize="10.5" fontWeight="bold">X2(s)</text>
            <rect x="540" y="49" width="120" height="52" rx="6" fill="#131c2e" stroke="#38bdf8" strokeWidth="2" />
            <text x="600" y="79" fill="#f8fafc" fontSize="12" fontWeight="bold" textAnchor="middle">{g3Val}</text>
            <line x1="660" y1="75" x2="730" y2="75" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow-blue)" />
            <text x="700" y="65" fill="#94a3b8" fontSize="11" fontWeight="bold">C(s)</text>
          </>
        ) : (
          <>
            <line x1="460" y1="75" x2="680" y2="75" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow-blue)" />
            <text x="640" y="65" fill="#94a3b8" fontSize="11" fontWeight="bold">C(s)</text>
          </>
        )}
      </svg>
    );
  }

  // =========================================================================
  // 3. ASSOCIAÇÃO EM PARALELO
  // =========================================================================
  if (presetKey === 'paralelo') {
    if (stageIndex >= 1) {
      return (
        <svg viewBox="0 0 760 180" width="100%" height="180" style={{ background: '#050811', borderRadius: 8 }}>
          {defs}
          <text x="380" y="24" textAnchor="middle" fill="#10b981" fontSize="11" fontWeight="bold">
            Etapa Final: Bloco Único Equivalente em Paralelo [G1(s) {isSub ? '-' : '+'} G2(s)]
          </text>
          <line x1="60" y1="100" x2="230" y2="100" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow-blue)" />
          <text x="80" y="90" fill="#94a3b8" fontSize="11" fontWeight="bold">R(s)</text>
          <rect x="230" y="74" width="300" height="52" rx="6" fill="#131c2e" stroke="#10b981" strokeWidth="2" />
          <text x="380" y="104" fill="#f8fafc" fontSize="12" fontWeight="bold" textAnchor="middle">
            G1(s) {isSub ? '-' : '+'} G2(s)
          </text>
          <line x1="530" y1="100" x2="700" y2="100" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow-blue)" />
          <text x="670" y="90" fill="#94a3b8" fontSize="11" fontWeight="bold">C(s)</text>
        </svg>
      );
    }

    return (
      <svg viewBox="0 0 760 180" width="100%" height="180" style={{ background: '#050811', borderRadius: 8 }}>
        {defs}
        <text x="380" y="20" textAnchor="middle" fill="#f59e0b" fontSize="10.5" fontWeight="bold">
          Etapa 1: Ramos Paralelos X1(s) = R(s)G1(s) e X2(s) = R(s)G2(s)
        </text>
        <line x1="30" y1="95" x2="120" y2="95" stroke="#38bdf8" strokeWidth="2" />
        <circle cx="120" cy="95" r="4" fill="#38bdf8" />
        <text x="50" y="85" fill="#94a3b8" fontSize="11" fontWeight="bold">R(s)</text>
        <line x1="120" y1="95" x2="120" y2="50" stroke="#38bdf8" strokeWidth="2" />
        <line x1="120" y1="50" x2="220" y2="50" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow-blue)" />
        <rect x="220" y="25" width="160" height="50" rx="6" fill="#131c2e" stroke="#38bdf8" strokeWidth="2" />
        <text x="300" y="55" fill="#f8fafc" fontSize="12" fontWeight="bold" textAnchor="middle">{g1Val}</text>
        <line x1="380" y1="50" x2="480" y2="50" stroke="#38bdf8" strokeWidth="2" />
        <line x1="480" y1="50" x2="480" y2="81" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow-blue)" />
        <line x1="120" y1="95" x2="120" y2="140" stroke="#38bdf8" strokeWidth="2" />
        <line x1="120" y1="140" x2="220" y2="140" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow-blue)" />
        <rect x="220" y="115" width="160" height="50" rx="6" fill="#131c2e" stroke="#38bdf8" strokeWidth="2" />
        <text x="300" y="145" fill="#f8fafc" fontSize="12" fontWeight="bold" textAnchor="middle">{g2Val}</text>
        <line x1="380" y1="140" x2="480" y2="140" stroke="#38bdf8" strokeWidth="2" />
        <line x1="480" y1="140" x2="480" y2="109" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow-blue)" />
        <circle cx="480" cy="95" r="16" fill="#0d1424" stroke="#38bdf8" strokeWidth="2" />
        <text x="473" y="85" fill="#38bdf8" fontSize="11">+</text>
        <text x="473" y="113" fill={isSub ? '#ef4444' : '#38bdf8'} fontSize="11">{isSub ? '-' : '+'}</text>
        <line x1="496" y1="95" x2="620" y2="95" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow-blue)" />
        <text x="560" y="85" fill="#94a3b8" fontSize="11" fontWeight="bold">C(s)</text>
      </svg>
    );
  }

  // =========================================================================
  // 4. PROPOSTO 1 (MALHAS DUPLAS SOBREPOSTAS)
  // =========================================================================
  if (stageIndex === 1) {
    // Malha interna H1 reduzida
    return (
      <svg viewBox="0 0 760 180" width="100%" height="180" style={{ background: '#050811', borderRadius: 8 }}>
        {defs}
        <text x="380" y="22" textAnchor="middle" fill="#f59e0b" fontSize="11" fontWeight="bold">
          Etapa 2: Malha Interna G2/(1 + G2·H1) Reduzida e em Série com G1(s)
        </text>
        <line x1="40" y1="80" x2="120" y2="80" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow-blue)" />
        <circle cx="140" cy="80" r="16" fill="#0d1424" stroke="#38bdf8" strokeWidth="2" />
        <text x="130" y="75" fill="#38bdf8" fontSize="11">+</text>
        <text x="138" y="93" fill="#ef4444" fontSize="11">-</text>
        <line x1="156" y1="80" x2="220" y2="80" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow-blue)" />
        <rect x="220" y="55" width="110" height="50" rx="6" fill="#131c2e" stroke="#38bdf8" strokeWidth="2" />
        <text x="275" y="85" fill="#f8fafc" fontSize="12" fontWeight="bold" textAnchor="middle">{g1Val}</text>
        <line x1="330" y1="80" x2="390" y2="80" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow-blue)" />
        <rect x="390" y="55" width="170" height="50" rx="6" fill="#131c2e" stroke="#10b981" strokeWidth="2" />
        <text x="475" y="85" fill="#f8fafc" fontSize="12" fontWeight="bold" textAnchor="middle">G2 / (1 + G2·H1)</text>
        <line x1="560" y1="80" x2="680" y2="80" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow-blue)" />
        <text x="640" y="70" fill="#94a3b8" fontSize="11" fontWeight="bold">C(s)</text>
        <circle cx="600" cy="80" r="4" fill="#38bdf8" />
        <line x1="600" y1="80" x2="600" y2="145" stroke="#38bdf8" strokeWidth="2" />
        <line x1="600" y1="145" x2="480" y2="145" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow-blue)" />
        <rect x="360" y="120" width="120" height="50" rx="6" fill="#131c2e" stroke="#a855f7" strokeWidth="2" />
        <text x="420" y="150" fill="#f8fafc" fontSize="12" fontWeight="bold" textAnchor="middle">H2 = {values.H2 || '2'}</text>
        <line x1="360" y1="145" x2="140" y2="145" stroke="#38bdf8" strokeWidth="2" />
        <line x1="140" y1="145" x2="140" y2="96" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow-blue)" />
      </svg>
    );
  }

  if (stageIndex >= 2) {
    // Redução Final Bloco Único
    return (
      <svg viewBox="0 0 760 180" width="100%" height="180" style={{ background: '#050811', borderRadius: 8 }}>
        {defs}
        <text x="380" y="24" textAnchor="middle" fill="#10b981" fontSize="11" fontWeight="bold">
          Etapa 3: Bloco Único Equivalente Final da Malha Global T(s) = C(s)/R(s)
        </text>
        <line x1="60" y1="100" x2="210" y2="100" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow-blue)" />
        <text x="90" y="90" fill="#94a3b8" fontSize="11" fontWeight="bold">R(s)</text>
        <rect x="210" y="65" width="340" height="70" rx="8" fill="#131c2e" stroke="#10b981" strokeWidth="2" />
        <text x="380" y="92" textAnchor="middle" fill="#38bdf8" fontSize="12" fontWeight="bold">G1 · G2</text>
        <line x1="240" y1="100" x2="520" y2="100" stroke="#64748b" strokeWidth="1.5" />
        <text x="380" y="122" textAnchor="middle" fill="#f8fafc" fontSize="12" fontWeight="bold">
          1 + G2·H1 + G1·G2·H2
        </text>
        <line x1="550" y1="100" x2="700" y2="100" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow-blue)" />
        <text x="670" y="90" fill="#94a3b8" fontSize="11" fontWeight="bold">C(s)</text>
      </svg>
    );
  }

  // Proposto 1 Etapa 0 / Original: Duas Malhas Sobrepostas
  return (
    <svg viewBox="0 0 760 180" width="100%" height="180" style={{ background: '#050811', borderRadius: 8 }}>
      {defs}
      <text x="380" y="20" textAnchor="middle" fill="#38bdf8" fontSize="10.5" fontWeight="bold">
        Etapa 1: Diagrama Original com Laço Interno H1 e Laço Externo H2
      </text>
      <line x1="30" y1="75" x2="90" y2="75" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow-blue)" />
      <circle cx="106" cy="75" r="14" fill="#0d1424" stroke="#38bdf8" strokeWidth="2" />
      <text x="97" y="71" fill="#38bdf8" fontSize="10">+</text>
      <text x="103" y="87" fill="#ef4444" fontSize="10">-</text>
      <line x1="120" y1="75" x2="170" y2="75" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow-blue)" />
      <rect x="170" y="52" width="90" height="46" rx="6" fill="#131c2e" stroke="#38bdf8" strokeWidth="2" />
      <text x="215" y="79" fill="#f8fafc" fontSize="11" fontWeight="bold" textAnchor="middle">{g1Val}</text>
      <line x1="260" y1="75" x2="310" y2="75" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow-blue)" />
      <circle cx="324" cy="75" r="14" fill="#0d1424" stroke="#f59e0b" strokeWidth="2" />
      <text x="315" y="71" fill="#38bdf8" fontSize="10">+</text>
      <text x="321" y="87" fill="#ef4444" fontSize="10">-</text>
      <line x1="338" y1="75" x2="390" y2="75" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow-blue)" />
      <rect x="390" y="52" width="100" height="46" rx="6" fill="#131c2e" stroke="#38bdf8" strokeWidth="2" />
      <text x="440" y="79" fill="#f8fafc" fontSize="11" fontWeight="bold" textAnchor="middle">{g2Val}</text>
      <line x1="490" y1="75" x2="620" y2="75" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow-blue)" />
      <text x="590" y="65" fill="#94a3b8" fontSize="11" fontWeight="bold">C(s)</text>
      {/* Ramificação interna H1 */}
      <circle cx="510" cy="75" r="4" fill="#f59e0b" />
      <line x1="510" y1="75" x2="510" y2="120" stroke="#f59e0b" strokeWidth="2" />
      <line x1="510" y1="120" x2="440" y2="120" stroke="#f59e0b" strokeWidth="2" markerEnd="url(#arrow-amber)" />
      <rect x="370" y="102" width="70" height="36" rx="4" fill="#131c2e" stroke="#f59e0b" strokeWidth="2" />
      <text x="405" y="124" fill="#f8fafc" fontSize="10" textAnchor="middle">H1 = {values.H1 || '1'}</text>
      <line x1="370" y1="120" x2="324" y2="120" stroke="#f59e0b" strokeWidth="2" />
      <line x1="324" y1="120" x2="324" y2="89" stroke="#f59e0b" strokeWidth="2" markerEnd="url(#arrow-amber)" />
      {/* Ramificação externa H2 */}
      <circle cx="550" cy="75" r="4" fill="#a855f7" />
      <line x1="550" y1="75" x2="550" y2="160" stroke="#a855f7" strokeWidth="2" />
      <line x1="550" y1="160" x2="440" y2="160" stroke="#a855f7" strokeWidth="2" markerEnd="url(#arrow-purple)" />
      <rect x="370" y="142" width="70" height="36" rx="4" fill="#131c2e" stroke="#a855f7" strokeWidth="2" />
      <text x="405" y="164" fill="#f8fafc" fontSize="10" textAnchor="middle">H2 = {values.H2 || '2'}</text>
      <line x1="370" y1="160" x2="106" y2="160" stroke="#a855f7" strokeWidth="2" />
      <line x1="106" y1="160" x2="106" y2="89" stroke="#a855f7" strokeWidth="2" markerEnd="url(#arrow-purple)" />
    </svg>
  );
};
