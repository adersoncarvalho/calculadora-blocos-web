'use client';

import React from 'react';

interface PresetSvgViewProps {
  presetKey: string;
  values: Record<string, string>;
}

export const PresetSvgView: React.FC<PresetSvgViewProps> = ({ presetKey, values }) => {
  const gVal = values.G || values.G1 || "G(s)";
  const hVal = values.H || values.H1 || "H(s)";
  const g2Val = values.G2 || "G_2(s)";
  const isNegative = (values.sinal || "Negativa (-)").includes("Negativa");
  const isSub = (values.op || "Adição (+)").includes("Subtração");

  if (presetKey === "cascata_dupla" || presetKey === "exemplo1" || presetKey === "exemplo2") {
    const isTriple = presetKey === "exemplo1";
    return (
      <svg viewBox="0 0 760 140" width="100%" height="140" style={{ background: "#050811", borderRadius: 8 }}>
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="7.5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 9 5 L 0 9 z" fill="#38bdf8" />
          </marker>
        </defs>
        {/* R(s) */}
        <line x1="30" y1="70" x2="110" y2="70" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow)" />
        <text x="50" y="60" fill="#94a3b8" fontSize="11" fontWeight="bold">R(s)</text>

        {/* Bloco 1 */}
        <rect x="110" y="44" width="130" height="52" rx="6" fill="#131c2e" stroke="#38bdf8" strokeWidth="2" />
        <text x="175" y="74" fill="#f8fafc" fontSize="12" fontWeight="bold" textAnchor="middle">{values.G1 || "G_1"}</text>

        {/* Linha intermediária 1 */}
        <line x1="240" y1="70" x2="330" y2="70" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow)" />

        {/* Bloco 2 */}
        <rect x="330" y="44" width="130" height="52" rx="6" fill="#131c2e" stroke="#38bdf8" strokeWidth="2" />
        <text x="395" y="74" fill="#f8fafc" fontSize="12" fontWeight="bold" textAnchor="middle">{values.G2 || "G_2"}</text>

        {isTriple ? (
          <>
            <line x1="460" y1="70" x2="540" y2="70" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow)" />
            <rect x="540" y="44" width="120" height="52" rx="6" fill="#131c2e" stroke="#38bdf8" strokeWidth="2" />
            <text x="600" y="74" fill="#f8fafc" fontSize="12" fontWeight="bold" textAnchor="middle">{values.G3 || "G_3"}</text>
            <line x1="660" y1="70" x2="730" y2="70" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow)" />
            <text x="700" y="60" fill="#94a3b8" fontSize="11" fontWeight="bold">C(s)</text>
          </>
        ) : (
          <>
            <line x1="460" y1="70" x2="580" y2="70" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow)" />
            <text x="540" y="60" fill="#94a3b8" fontSize="11" fontWeight="bold">C(s)</text>
          </>
        )}
      </svg>
    );
  }

  if (presetKey === "paralelo") {
    return (
      <svg viewBox="0 0 760 180" width="100%" height="180" style={{ background: "#050811", borderRadius: 8 }}>
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="7.5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 9 5 L 0 9 z" fill="#38bdf8" />
          </marker>
        </defs>
        {/* Entrada */}
        <line x1="30" y1="90" x2="120" y2="90" stroke="#38bdf8" strokeWidth="2" />
        <circle cx="120" cy="90" r="4" fill="#38bdf8" />
        <text x="50" y="80" fill="#94a3b8" fontSize="11" fontWeight="bold">R(s)</text>

        {/* Ramo superior */}
        <line x1="120" y1="90" x2="120" y2="45" stroke="#38bdf8" strokeWidth="2" />
        <line x1="120" y1="45" x2="220" y2="45" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow)" />
        <rect x="220" y="20" width="160" height="50" rx="6" fill="#131c2e" stroke="#38bdf8" strokeWidth="2" />
        <text x="300" y="50" fill="#f8fafc" fontSize="12" fontWeight="bold" textAnchor="middle">{values.G1 || "G_1(s)"}</text>
        <line x1="380" y1="45" x2="480" y2="45" stroke="#38bdf8" strokeWidth="2" />
        <line x1="480" y1="45" x2="480" y2="76" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow)" />

        {/* Ramo inferior */}
        <line x1="120" y1="90" x2="120" y2="135" stroke="#38bdf8" strokeWidth="2" />
        <line x1="120" y1="135" x2="220" y2="135" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow)" />
        <rect x="220" y="110" width="160" height="50" rx="6" fill="#131c2e" stroke="#38bdf8" strokeWidth="2" />
        <text x="300" y="140" fill="#f8fafc" fontSize="12" fontWeight="bold" textAnchor="middle">{values.G2 || "G_2(s)"}</text>
        <line x1="380" y1="135" x2="480" y2="135" stroke="#38bdf8" strokeWidth="2" />
        <line x1="480" y1="135" x2="480" y2="104" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow)" />

        {/* Somador */}
        <circle cx="480" cy="90" r="16" fill="#0d1424" stroke="#38bdf8" strokeWidth="2" />
        <text x="473" y="80" fill="#38bdf8" fontSize="11">+</text>
        <text x="473" y="108" fill={isSub ? "#ef4444" : "#38bdf8"} fontSize="11">{isSub ? "-" : "+"}</text>

        {/* Saída */}
        <line x1="496" y1="90" x2="620" y2="90" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow)" />
        <text x="560" y="80" fill="#94a3b8" fontSize="11" fontWeight="bold">C(s)</text>
      </svg>
    );
  }

  // Malha Fechada padrão
  return (
    <svg viewBox="0 0 760 180" width="100%" height="180" style={{ background: "#050811", borderRadius: 8 }}>
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="7.5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 9 5 L 0 9 z" fill="#38bdf8" />
        </marker>
      </defs>
      {/* Entrada e Somador */}
      <line x1="40" y1="70" x2="130" y2="70" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow)" />
      <text x="60" y="60" fill="#94a3b8" fontSize="11" fontWeight="bold">R(s)</text>
      <circle cx="150" cy="70" r="16" fill="#0d1424" stroke="#38bdf8" strokeWidth="2" />
      <text x="138" y="66" fill="#38bdf8" fontSize="11">+</text>
      <text x="146" y="84" fill={isNegative ? "#ef4444" : "#10b981"} fontSize="11">{isNegative ? "-" : "+"}</text>

      {/* Caminho Direto G */}
      <line x1="166" y1="70" x2="250" y2="70" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow)" />
      <text x="190" y="60" fill="#94a3b8" fontSize="10.5">E(s)</text>
      <rect x="250" y="44" width="180" height="52" rx="6" fill="#131c2e" stroke="#38bdf8" strokeWidth="2" />
      <text x="340" y="74" fill="#f8fafc" fontSize="12" fontWeight="bold" textAnchor="middle">{gVal}</text>

      {/* Saída C(s) */}
      <line x1="430" y1="70" x2="600" y2="70" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow)" />
      <text x="560" y="60" fill="#94a3b8" fontSize="11" fontWeight="bold">C(s)</text>
      <circle cx="500" cy="70" r="4" fill="#38bdf8" />

      {/* Realimentação H */}
      <line x1="500" y1="70" x2="500" y2="135" stroke="#38bdf8" strokeWidth="2" />
      <line x1="500" y1="135" x2="430" y2="135" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow)" />
      <rect x="250" y="110" width="180" height="50" rx="6" fill="#131c2e" stroke="#a855f7" strokeWidth="2" />
      <text x="340" y="140" fill="#f8fafc" fontSize="12" fontWeight="bold" textAnchor="middle">{hVal}</text>
      <line x1="250" y1="135" x2="150" y2="135" stroke="#38bdf8" strokeWidth="2" />
      <line x1="150" y1="135" x2="150" y2="86" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow)" />
    </svg>
  );
};
