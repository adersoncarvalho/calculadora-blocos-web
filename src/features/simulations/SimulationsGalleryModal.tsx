'use client';

import React, { useState, useMemo } from 'react';
import { MathView } from '@/components/MathView';
import simulationsRaw from '../../../Simulacoes_Resultados/simulations.json';

interface SimulationItem {
  id: string;
  num: string;
  topoKey: string;
  topoBadge: string;
  titulo: string;
  subtitulo: string;
  svg: string;
  stepTitle: string;
  stepDesc: string;
  stepLatex: string;
  finalLatex: string;
  polos: string[];
  zeros: string[];
  estabilidade: string;
  ordem: string;
  ganhoDC: string;
}

interface SimulationsGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SimulationsGalleryModal: React.FC<SimulationsGalleryModalProps> = ({ isOpen, onClose }) => {
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const list: SimulationItem[] = simulationsRaw as SimulationItem[];

  const filtered = useMemo(() => {
    return list.filter(item => {
      const matchFilter = filter === 'all' || item.topoKey === filter;
      const matchSearch =
        search.trim() === '' ||
        item.titulo.toLowerCase().includes(search.toLowerCase()) ||
        item.subtitulo.toLowerCase().includes(search.toLowerCase()) ||
        item.num.includes(search);
      return matchFilter && matchSearch;
    });
  }, [list, filter, search]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(5, 8, 17, 0.88)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '1100px',
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: '28px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.8)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header da Galeria */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--card-border)', paddingBottom: '14px', marginBottom: '20px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--primary)' }}>
              📊 Banco de 20 Simulações Reais & Casos Práticos
            </h2>
            <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.86rem' }}>
              Parâmetros numéricos reais e memorial passo a passo das 4 topologias fundamentais da Engenharia de Controle
            </p>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            style={{ padding: '6px 14px', cursor: 'pointer' }}
          >
            ✕ Fechar
          </button>
        </div>

        {/* Filtros e Busca */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              Todas (20)
            </button>
            <button
              type="button"
              className={`filter-btn ${filter === 'top1' ? 'active' : ''}`}
              onClick={() => setFilter('top1')}
            >
              Cascata (01-05)
            </button>
            <button
              type="button"
              className={`filter-btn ${filter === 'top2' ? 'active' : ''}`}
              onClick={() => setFilter('top2')}
            >
              Paralelo (06-10)
            </button>
            <button
              type="button"
              className={`filter-btn ${filter === 'top3' ? 'active' : ''}`}
              onClick={() => setFilter('top3')}
            >
              Realimentação (11-15)
            </button>
            <button
              type="button"
              className={`filter-btn ${filter === 'top4' ? 'active' : ''}`}
              onClick={() => setFilter('top4')}
            >
              Mistas & Múltiplas (16-20)
            </button>
          </div>

          <input
            type="text"
            placeholder="🔍 Buscar por número ou título..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              background: 'var(--code-bg)',
              color: 'var(--text)',
              border: '1px solid var(--card-border)',
              fontSize: '0.85rem',
              width: '260px'
            }}
          />
        </div>

        {/* Grid de Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '18px' }}>
          {filtered.map(sim => (
            <div
              key={sim.id}
              style={{
                background: 'var(--code-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: '10px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)', background: 'rgba(56, 189, 248, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                    {sim.topoBadge}
                  </span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                    #{sim.num}
                  </span>
                </div>

                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.98rem', color: 'var(--text)' }}>
                  {sim.titulo}
                </h4>
                <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  {sim.subtitulo}
                </p>

                {/* SVG Renderizado */}
                <div
                  style={{
                    background: '#040711',
                    borderRadius: '6px',
                    padding: '8px',
                    marginBottom: '12px',
                    border: '1px solid rgba(255,255,255,0.05)',
                    overflowX: 'auto'
                  }}
                  dangerouslySetInnerHTML={{ __html: sim.svg }}
                />

                {/* Função de Transferência Final */}
                <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '8px', borderRadius: '6px', textAlign: 'center', marginBottom: '10px' }}>
                  <MathView math={sim.finalLatex} block />
                </div>

                {/* Badges de Estabilidade e Ordem */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', fontSize: '0.74rem', marginBottom: '10px' }}>
                  <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                    {sim.estabilidade}
                  </span>
                  <span style={{ background: 'rgba(148, 163, 184, 0.15)', color: 'var(--text-muted)', padding: '2px 6px', borderRadius: '4px' }}>
                    {sim.ordem}
                  </span>
                </div>
              </div>

              {/* Botão Ver Memorial Completo */}
              <button
                type="button"
                className="filter-btn"
                onClick={() => setExpandedId(expandedId === sim.id ? null : sim.id)}
                style={{ width: '100%', padding: '6px 0', fontSize: '0.8rem', marginTop: '6px' }}
              >
                {expandedId === sim.id ? '▲ Ocultar Resolução' : '▼ Ver Memorial Passo a Passo'}
              </button>

              {expandedId === sim.id && (
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--card-border)', fontSize: '0.8rem' }}>
                  <div style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '4px' }}>
                    {sim.stepTitle}
                  </div>
                  <div style={{ color: 'var(--text-muted)', marginBottom: '8px' }}>
                    {sim.stepDesc}
                  </div>
                  <div style={{ background: '#020617', padding: '8px', borderRadius: '6px', overflowX: 'auto' }}>
                    <MathView math={sim.stepLatex} block />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
