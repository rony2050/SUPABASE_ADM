import React, { useState, useEffect } from 'react';
import { X, Plus, Sparkles, AlertCircle, RefreshCw, Key, Server } from 'lucide-react';

interface CreateInstanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (params: {
    name: string;
    portBase?: number;
    dbPassword?: string;
    startAfter: boolean;
  }) => Promise<void>;
  isCreating: boolean;
}

export const CreateInstanceModal: React.FC<CreateInstanceModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  isCreating,
}) => {
  const [name, setName] = useState('');
  const [portBase, setPortBase] = useState<number>(54300);
  const [suggestedPort, setSuggestedPort] = useState<number>(54300);
  const [useCustomPort, setUseCustomPort] = useState(false);
  const [dbPassword, setDbPassword] = useState('');
  const [startAfter, setStartAfter] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Buscar próxima porta livre ao abrir modal
  useEffect(() => {
    if (isOpen) {
      fetch('/api/instances/next-port')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.portBase) {
            setSuggestedPort(data.portBase);
            setPortBase(data.portBase);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = name.trim().toLowerCase();
    if (!cleanName) {
      setError('Por favor, informe o nome da instância.');
      return;
    }

    if (!/^[a-z0-9_-]+$/.test(cleanName)) {
      setError('O nome deve conter apenas letras minúsculas, números, hífens ou sublinhados.');
      return;
    }

    try {
      await onCreate({
        name: cleanName,
        portBase: useCustomPort ? portBase : suggestedPort,
        dbPassword: dbPassword.trim() || undefined,
        startAfter,
      });
      setName('');
      setDbPassword('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Falha ao criar instância.');
    }
  };

  const activeBase = useCustomPort ? portBase : suggestedPort;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      
      <div className="glass-panel" style={{ width: '100%', maxWidth: '580px', padding: '1.75rem', position: 'relative' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ background: 'rgba(62, 207, 142, 0.1)', padding: '8px', borderRadius: '8px' }}>
              <Plus size={20} color="#3ecf8e" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>
                Nova Instância Supabase Local
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Provisionamento isolado via Docker Compose
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isCreating}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.75rem', borderRadius: '8px', color: '#ef4444', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          
          {/* Nome da Instância */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
              Nome da Instância / Projeto <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: app-dev, e-commerce, clientes"
              disabled={isCreating}
              required
              style={{
                width: '100%',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '0.75rem',
                color: '#fff',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
              Identificador único para containers e volumes Docker (sem espaços).
            </span>
          </div>

          {/* Configuração de Portas */}
          <div style={{ marginBottom: '1.25rem', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Server size={14} color="#3ecf8e" />
                <span>Bloco de Portas (Port Offset)</span>
              </span>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={useCustomPort}
                  onChange={(e) => setUseCustomPort(e.target.checked)}
                />
                <span>Personalizar Porta</span>
              </label>
            </div>

            {useCustomPort ? (
              <input
                type="number"
                value={portBase}
                onChange={(e) => setPortBase(parseInt(e.target.value, 10))}
                step={100}
                min={1024}
                max={65000}
                style={{
                  width: '100%',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  padding: '0.5rem',
                  color: '#fff',
                  fontSize: '0.85rem',
                  outline: 'none',
                  marginBottom: '0.5rem',
                }}
              />
            ) : (
              <div style={{ fontSize: '0.8rem', color: '#3ecf8e', fontWeight: 600, marginBottom: '0.5rem' }}>
                Automático sugerido: Base {suggestedPort}
              </div>
            )}

            {/* Pré-visualização de portas mapeadas */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', fontSize: '0.75rem', background: 'var(--bg-primary)', padding: '0.5rem', borderRadius: '6px' }}>
              <div><span style={{ color: 'var(--text-muted)' }}>Postgres:</span> <b style={{ color: '#c084fc' }}>{activeBase}</b></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Kong API:</span> <b style={{ color: '#60a5fa' }}>{activeBase + 1}</b></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Studio UI:</span> <b style={{ color: '#3ecf8e' }}>{activeBase + 3}</b></div>
              <div><span style={{ color: 'var(--text-muted)' }}>REST API:</span> <b>{activeBase + 4}</b></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Auth:</span> <b>{activeBase + 5}</b></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Storage:</span> <b>{activeBase + 6}</b></div>
            </div>
          </div>

          {/* Senha do Postgres (Opcional) */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Key size={14} color="#f59e0b" />
                <span>Senha do PostgreSQL (Opcional)</span>
              </label>
              <button
                type="button"
                onClick={() => setDbPassword(Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-8))}
                style={{ background: 'transparent', border: 'none', color: '#3ecf8e', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Sparkles size={12} />
                <span>Gerar Senha Forte</span>
              </button>
            </div>
            <input
              type="text"
              value={dbPassword}
              onChange={(e) => setDbPassword(e.target.value)}
              placeholder="Deixe em branco para auto-gerar chave criptográfica"
              disabled={isCreating}
              style={{
                width: '100%',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '0.75rem',
                color: '#fff',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Opção Iniciar Imediatamente */}
          <div style={{ marginBottom: '1.75rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={startAfter}
                onChange={(e) => setStartAfter(e.target.checked)}
                disabled={isCreating}
              />
              <span>Iniciar containers Docker automaticamente após criação</span>
            </label>
          </div>

          {/* Botões do Rodapé */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isCreating}
              style={{
                background: 'transparent',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isCreating}
              style={{
                background: 'linear-gradient(135deg, #3ecf8e 0%, #2bb879 100%)',
                color: '#0d281e',
                border: 'none',
                padding: '8px 20px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: isCreating ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 10px rgba(62, 207, 142, 0.3)',
              }}
            >
              {isCreating && <RefreshCw size={14} className="animate-spin" />}
              <span>{isCreating ? 'Provisionando containers...' : 'Criar Instância'}</span>
            </button>
          </div>

        </form>

      </div>

    </div>
  );
};
