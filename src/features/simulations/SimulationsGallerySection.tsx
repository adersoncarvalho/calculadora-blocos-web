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

interface SimulationsGallerySectionProps {
  onBack: () => void;
  onNavigate?: (view: 'builder' | 'guide' | 'practice') => void;
}

export const SimulationsGallerySection: React.FC<SimulationsGallerySectionProps> = ({ onBack, onNavigate }) => {
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

  return (
    <section style={{ maxWidth: '1280px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Barra Superior Dedicada */}
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
          marginBottom: '24px',
          boxShadow: '0 4px 18px rgba(0,0,0,0.4)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
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
              📊 Banco de 20 Simulações Reais & Casos Práticos
            </h1>
            <p style={{ margin: '2px 0 0 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              Parâmetros numéricos reais e memorial analítico passo a passo das 4 topologias fundamentais da Engenharia de Controle
            </p>
          </div>
        </div>

        {/* Links rápidos */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {onNavigate && (
            <>
              <button
                type="button"
                className="filter-btn"
                onClick={() => onNavigate('guide')}
                style={{ fontSize: '0.82rem', padding: '6px 12px' }}
              >
                📖 Ver Guia Teórico
              </button>
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
            </>
          )}
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
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
          padding: '16px 20px',
          marginBottom: '24px'
        }}
      >
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
          className="input-text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Buscar por título, número ou polo..."
          style={{
            padding: '8px 14px',
            borderRadius: '6px',
            background: 'var(--code-bg)',
            color: 'var(--text)',
            border: '1px solid var(--card-border)',
            minWidth: '280px',
            fontSize: '0.85rem'
          }}
        />
      </div>

      {/* Grade de Cards das Simulações */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
        {filtered.map(item => {
          const isExpanded = expandedId === item.id;
          return (
            <div
              key={item.id}
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: '10px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 4px 12px rgba(0,0,0,0.25)'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.74rem', background: 'rgba(56,189,248,0.15)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                    Caso #{item.num} • {item.topoBadge}
                  </span>
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: item.estabilidade.includes('Estável') ? 'var(--success)' : 'var(--danger)' }}>
                    {item.estabilidade}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.02rem', margin: '4px 0 6px 0', color: 'var(--text)', fontWeight: 700 }}>
                  {item.titulo}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 12px 0' }}>
                  {item.subtitulo}
                </p>

                {/* Diagrama Esquemático SVG */}
                <div
                  style={{
                    background: 'var(--code-bg)',
                    borderRadius: '8px',
                    padding: '8px',
                    border: '1px solid var(--card-border)',
                    marginBottom: '12px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}
                  dangerouslySetInnerHTML={{ __html: item.svg }}
                />

                {/* Função de Transferência Equivalente */}
                <div style={{ background: 'var(--code-bg)', padding: '10px', borderRadius: '6px', textAlign: 'center', border: '1px solid var(--card-border)', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Função de Transferência T(s):
                  </span>
                  <MathView math={item.finalLatex} block />
                </div>

                {/* Parâmetros Dinâmicos Resumidos */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', fontSize: '0.78rem', marginBottom: '12px' }}>
                  <div style={{ background: 'rgba(2, 6, 23, 0.4)', padding: '6px 8px', borderRadius: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Ordem:</span> <b>{item.ordem}</b>
                  </div>
                  <div style={{ background: 'rgba(2, 6, 23, 0.4)', padding: '6px 8px', borderRadius: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Ganho DC:</span> <b>{item.ganhoDC}</b>
                  </div>
                </div>

                {/* Painel Expansível de Memorial */}
                {isExpanded && (
                  <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--card-border)' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--primary)', marginBottom: '4px' }}>
                      {item.stepTitle}
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 8px 0' }}>
                      {item.stepDesc}
                    </p>
                    <div style={{ background: 'var(--code-bg)', padding: '8px', borderRadius: '6px', marginBottom: '8px' }}>
                      <MathView math={item.stepLatex} block />
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      <b>Polos:</b> {item.polos?.join(', ') || 'Nenhum'} | <b>Zeros:</b> {item.zeros?.join(', ') || 'Nenhum'}
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                className="filter-btn"
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
                style={{ width: '100%', justifyContent: 'center', marginTop: '10px', fontSize: '0.8rem', padding: '6px 12px' }}
              >
                {isExpanded ? '▲ Recolher Memorial' : '▼ Ver Memorial Passo a Passo'}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
};
