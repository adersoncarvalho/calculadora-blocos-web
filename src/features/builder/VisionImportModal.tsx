'use client';

import React, { useState, useEffect, useRef } from 'react';
import { DiagramGraph } from '@/core/reduction/mason';
import {
  recognizeDiagramWithGemini,
  SAMPLE_DIAGRAMS,
  DiagramSample
} from './visionService';

interface VisionImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportGraph: (graph: DiagramGraph, title?: string) => void;
  initialImageBase64?: string | null;
}

export const VisionImportModal: React.FC<VisionImportModalProps> = ({
  isOpen,
  onClose,
  onImportGraph,
  initialImageBase64 = null
}) => {
  const [apiKey, setApiKey] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(initialImageBase64);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'samples'>('upload');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Carrega chave salva do localStorage ao abrir
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedKey = localStorage.getItem('gemini_api_key') || '';
      setApiKey(savedKey);
    }
  }, [isOpen]);

  // Se initialImageBase64 mudar externamente (ex: Ctrl+V enquanto a modal estava fechando)
  useEffect(() => {
    if (initialImageBase64) {
      setSelectedImage(initialImageBase64);
      setActiveTab('upload');
      setErrorMsg(null);
    }
  }, [initialImageBase64]);

  // Salva chave no localStorage ao alterar
  const handleApiKeyChange = (val: string) => {
    setApiKey(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('gemini_api_key', val.trim());
    }
  };

  // Processa arquivo de imagem
  const handleProcessFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Por favor, selecione um arquivo de imagem válido (PNG, JPG, WEBP).');
      return;
    }
    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = e => {
      const base64 = e.target?.result as string;
      setSelectedImage(base64);
    };
    reader.readAsDataURL(file);
  };

  // Evento de colar (Ctrl+V) dentro do modal
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile();
          if (blob) {
            handleProcessFile(blob);
            setActiveTab('upload');
            e.preventDefault();
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  // Disparo do processamento por IA
  const handleRecognize = async () => {
    if (!selectedImage) {
      setErrorMsg('Nenhuma imagem selecionada. Cole um print ou faça upload de um arquivo.');
      return;
    }

    if (!apiKey || apiKey.trim() === '') {
      setErrorMsg(
        'Informe sua chave gratuita da API do Google Gemini abaixo (ou teste um dos Exemplos Prontos na aba ao lado).'
      );
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setLoadingStep('Enviando imagem ao modelo multimodal de visão...');

    try {
      setLoadingStep('Analisando diagrama com Google Gemini...');
      const graph = await recognizeDiagramWithGemini(selectedImage, apiKey.trim());
      
      setLoadingStep('Diagrama estruturado com sucesso! Renderizando...');
      setTimeout(() => {
        setIsLoading(false);
        onImportGraph(graph, 'Diagrama Reconhecido por IA');
        onClose();
      }, 400);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(
        err.message || 'Erro ao processar imagem. Verifique se a chave de API é válida e tente novamente.'
      );
    }
  };

  // Importar modelo demonstrativo pré-carregado
  const handleSelectSample = (sample: DiagramSample) => {
    setIsLoading(true);
    setLoadingStep(`Carregando "${sample.title}"...`);
    setTimeout(() => {
      setIsLoading(false);
      onImportGraph(sample.graph, sample.title);
      onClose();
    }, 300);
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(5px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={e => {
        if (e.target === e.currentTarget && !isLoading) onClose();
      }}
    >
      <div
        style={{
          background: '#0a0f1d',
          border: '1px solid var(--primary)',
          borderRadius: '14px',
          width: '100%',
          maxWidth: '740px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
          overflow: 'hidden'
        }}
      >
        {/* Cabeçalho do Modal */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--card-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(56, 189, 248, 0.05)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.4rem' }}>📷</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text)', fontWeight: 800 }}>
                Importar Diagrama via Print ou Imagem (Vision AI)
              </h2>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Cole um print (Ctrl+V) ou suba uma foto para construir a topologia de blocos automaticamente
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '1.25rem',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '6px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Abas Superiores */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--card-border)',
            background: '#070b16'
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: activeTab === 'upload' ? '#0a0f1d' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'upload' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'upload' ? 'var(--primary)' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '0.86rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            🖼️ Minha Imagem / Print (Ctrl+V)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('samples')}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: activeTab === 'samples' ? '#0a0f1d' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'samples' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'samples' ? 'var(--primary)' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '0.86rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            ✨ Exemplos Prontos de Livros (Teste Instantâneo)
          </button>
        </div>

        {/* Conteúdo do Modal */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {activeTab === 'upload' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Dropzone / Paste Area */}
              <div
                onDragOver={e => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={e => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleProcessFile(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => {
                  if (!selectedImage && fileInputRef.current) {
                    fileInputRef.current.click();
                  }
                }}
                style={{
                  border: `2px dashed ${
                    isDragging ? 'var(--primary)' : selectedImage ? '#10b981' : 'var(--card-border)'
                  }`,
                  borderRadius: '10px',
                  padding: selectedImage ? '12px' : '32px 20px',
                  textAlign: 'center',
                  background: isDragging
                    ? 'rgba(56, 189, 248, 0.08)'
                    : selectedImage
                    ? '#050811'
                    : 'rgba(255, 255, 255, 0.02)',
                  cursor: selectedImage ? 'default' : 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  style={{ display: 'none' }}
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      handleProcessFile(e.target.files[0]);
                    }
                  }}
                />

                {selectedImage ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <div style={{ position: 'relative', maxWidth: '100%', maxHeight: '220px', overflow: 'hidden', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                      <img
                        src={selectedImage}
                        alt="Diagrama selecionado"
                        style={{ maxWidth: '100%', maxHeight: '220px', objectFit: 'contain', display: 'block' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="filter-btn"
                        style={{ fontSize: '0.78rem', padding: '5px 12px' }}
                      >
                        🔄 Trocar Imagem
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedImage(null)}
                        className="filter-btn"
                        style={{ fontSize: '0.78rem', padding: '5px 12px', color: '#ef4444' }}
                      >
                        ✕ Limpar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '2.4rem', marginBottom: '8px' }}>📋</div>
                    <div style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--text)', marginBottom: '4px' }}>
                      Pressione <kbd style={{ background: '#1e293b', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--card-border)', color: 'var(--primary)' }}>Ctrl + V</kbd> para colar o print do diagrama
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      ou clique aqui para selecionar um arquivo PNG, JPG ou WEBP do seu computador
                    </div>
                  </div>
                )}
              </div>

              {/* Configuração da Chave da API Google Gemini */}
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '10px',
                  padding: '14px 16px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🔑 Chave de API do Google Gemini (Gratuita):
                  </label>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: '0.76rem',
                      color: 'var(--primary)',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontWeight: 600
                    }}
                  >
                    ↗ Obter chave gratuita no Google AI Studio (30s)
                  </a>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={e => handleApiKeyChange(e.target.value)}
                    placeholder="Cole sua AIzaSy... aqui"
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: '#050811',
                      border: '1px solid var(--card-border)',
                      color: 'var(--text)',
                      fontFamily: 'monospace',
                      fontSize: '0.86rem'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(prev => !prev)}
                    className="filter-btn"
                    style={{ padding: '8px 12px', fontSize: '0.78rem' }}
                    title={showApiKey ? 'Ocultar chave' : 'Mostrar chave'}
                  >
                    {showApiKey ? '👁️ Ocultar' : '👁️ Ver'}
                  </button>
                </div>
                <p style={{ margin: '6px 0 0 0', fontSize: '0.73rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  🔒 <b>Privacidade total:</b> A chave fica salva apenas no seu próprio navegador (<code style={{ color: 'var(--primary)' }}>localStorage</code>) e comunica diretamente com a API oficial do Google.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'samples' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                Selecione um dos exemplos didáticos para testar a renderização e o cálculo de Mason sem precisar de chave de API:
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                {SAMPLE_DIAGRAMS.map(sample => (
                  <div
                    key={sample.id}
                    onClick={() => handleSelectSample(sample)}
                    style={{
                      background: '#050811',
                      border: '1px solid var(--card-border)',
                      borderRadius: '10px',
                      padding: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)';
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--card-border)';
                      (e.currentTarget as HTMLElement).style.transform = 'none';
                    }}
                  >
                    <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--primary)' }}>
                      {sample.title}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {sample.description}
                    </div>
                    <div
                      style={{
                        background: '#070b16',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '6px',
                        padding: '6px',
                        overflow: 'hidden'
                      }}
                      dangerouslySetInnerHTML={{ __html: sample.previewSvg.replace('data:image/svg+xml;utf8,', '') }}
                    />
                    <button
                      type="button"
                      className="filter-btn"
                      style={{
                        marginTop: '4px',
                        width: '100%',
                        padding: '6px 0',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        borderColor: 'var(--primary)',
                        color: 'var(--primary)'
                      }}
                    >
                      Carregar este Diagrama ➔
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Feedback de Erro */}
          {errorMsg && (
            <div
              style={{
                marginTop: '16px',
                padding: '10px 14px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid #ef4444',
                borderRadius: '8px',
                color: '#fca5a5',
                fontSize: '0.82rem',
                lineHeight: '1.45'
              }}
            >
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Feedback de Carregamento */}
          {isLoading && (
            <div
              style={{
                marginTop: '16px',
                padding: '14px',
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid var(--primary)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid var(--primary)',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}
              />
              <span style={{ fontSize: '0.86rem', color: 'var(--text)', fontWeight: 600 }}>
                {loadingStep}
              </span>
            </div>
          )}
        </div>

        {/* Rodapé de Ações */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--card-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(0, 0, 0, 0.2)'
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="filter-btn"
            style={{ padding: '8px 16px', fontSize: '0.84rem' }}
          >
            Cancelar
          </button>

          {activeTab === 'upload' && (
            <button
              type="button"
              onClick={handleRecognize}
              disabled={isLoading || !selectedImage}
              className="btn-primary"
              style={{
                padding: '9px 20px',
                fontSize: '0.88rem',
                fontWeight: 800,
                opacity: isLoading || !selectedImage ? 0.4 : 1,
                cursor: isLoading || !selectedImage ? 'not-allowed' : 'pointer'
              }}
            >
              🚀 Analisar e Construir Diagrama
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};
