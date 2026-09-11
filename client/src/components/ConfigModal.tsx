import React, { useState, useEffect } from 'react';
import { X, Save, RotateCw, FileCode, Check, Copy, Download, AlertCircle } from 'lucide-react';

interface ConfigModalProps {
  instanceName: string | null;
  onClose: () => void;
  onSaved?: (message: string) => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({ instanceName, onClose, onSaved }) => {
  const [content, setContent] = useState<string>('');
  const [configPath, setConfigPath] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [restartAfter, setRestartAfter] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!instanceName) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    fetch(`/api/instances/${instanceName}/config`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success) {
          setContent(data.data.content);
          setConfigPath(data.data.path);
        } else {
          setError(data.error || 'Falha ao carregar config.toml');
        }
      })
      .catch((err) => {
        if (isMounted) setError(err.message || 'Erro de conexão');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [instanceName]);

  if (!instanceName) return null;

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/instances/${instanceName}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, restartAfter }),
      });
      const data = await res.json();
      if (data.success) {
        if (onSaved) onSaved(data.message || 'Configuração salva com sucesso!');
        onClose();
      } else {
        setError(data.error || 'Falha ao salvar config.toml');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao comunicar com a API.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${instanceName}-config.toml`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '850px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', padding: '1.5rem', position: 'relative' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ background: 'rgba(59, 130, 246, 0.12)', padding: '8px', borderRadius: '8px' }}>
              <FileCode size={20} color="#60a5fa" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
                  Editar config.toml
                </h2>
                <span style={{ fontSize: '0.75rem', background: 'rgba(62, 207, 142, 0.15)', color: '#3ecf8e', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                  {instanceName}
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Configuração TOML oficial do Supabase • Salva e sincroniza automaticamente com os containers
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', padding: '10px 14px', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Editor Body */}
        <div style={{ flex: 1, minHeight: '340px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-muted)' }}>
              <RotateCw size={24} className="animate-spin" style={{ marginRight: '8px' }} />
              <span>Carregando arquivo config.toml...</span>
            </div>
          ) : (
            <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                spellCheck={false}
                style={{
                  flex: 1,
                  width: '100%',
                  minHeight: '380px',
                  background: '#0d1117',
                  color: '#e6edf3',
                  fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                  fontSize: '0.85rem',
                  lineHeight: '1.5',
                  padding: '1rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  resize: 'none',
                  outline: 'none',
                }}
              />
            </div>
          )}
        </div>

        {/* Footer & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: '0.75rem' }}>
          
          {/* Opções e Botões de Cópia */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={restartAfter}
                onChange={(e) => setRestartAfter(e.target.checked)}
                style={{ accentColor: '#3ecf8e', cursor: 'pointer' }}
              />
              <span>Reiniciar containers após salvar</span>
            </label>

            <button
              onClick={handleCopy}
              disabled={isLoading}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {copied ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
              <span>{copied ? 'Copiado' : 'Copiar'}</span>
            </button>

            <button
              onClick={handleDownload}
              disabled={isLoading}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Download size={13} />
              <span>Baixar</span>
            </button>
          </div>

          {/* Botões de Ação */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={onClose}
              disabled={isSaving}
              style={{
                background: 'transparent',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving || isLoading}
              style={{
                background: 'linear-gradient(135deg, #3ecf8e 0%, #2bb879 100%)',
                color: '#0d281e',
                border: 'none',
                padding: '8px 18px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: isSaving ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 10px rgba(62, 207, 142, 0.3)',
              }}
            >
              <Save size={15} />
              <span>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
