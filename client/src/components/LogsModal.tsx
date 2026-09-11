import React, { useEffect, useState, useRef } from 'react';
import { X, Terminal, Trash2, ArrowDown, Filter } from 'lucide-react';

interface LogsModalProps {
  instanceName: string | null;
  onClose: () => void;
}

export const LogsModal: React.FC<LogsModalProps> = ({ instanceName, onClose }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [selectedService, setSelectedService] = useState<string>('all');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const services = [
    { id: 'all', label: 'Todos os Serviços' },
    { id: 'kong', label: 'Kong (Gateway)' },
    { id: 'db', label: 'PostgreSQL' },
    { id: 'auth', label: 'Auth (GoTrue)' },
    { id: 'rest', label: 'PostgREST' },
    { id: 'studio', label: 'Studio UI' },
    { id: 'storage', label: 'Storage' },
    { id: 'realtime', label: 'Realtime' },
    { id: 'meta', label: 'Meta' },
  ];

  useEffect(() => {
    if (!instanceName) return;

    setLogs([]);
    setIsConnected(false);

    let url = `/api/instances/${instanceName}/logs/stream`;
    if (selectedService !== 'all') {
      url += `?service=${selectedService}`;
    }

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.chunk) {
          setLogs((prev) => [...prev, data.chunk]);
        }
        if (data.closed) {
          setIsConnected(false);
        }
      } catch {
        // Fallback
        setLogs((prev) => [...prev, event.data]);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [instanceName, selectedService]);

  useEffect(() => {
    if (autoScroll) {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  if (!instanceName) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      
      <div className="glass-panel" style={{ width: '100%', maxWidth: '900px', height: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Header do Terminal de Logs */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Terminal size={18} color="#3b82f6" />
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#fff' }}>
                Live Container Logs: <span style={{ color: '#3ecf8e' }}>{instanceName}</span>
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', marginTop: '2px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: isConnected ? '#10b981' : 'var(--text-muted)' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isConnected ? '#10b981' : '#666' }} className={isConnected ? 'animate-pulse' : ''} />
                  {isConnected ? 'Stream Ativo (SSE)' : 'Conectando / Parado'}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Filtro por serviço */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-tertiary)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
              <Filter size={13} color="var(--text-muted)" />
              <select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.75rem', outline: 'none', cursor: 'pointer' }}
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id} style={{ background: '#1e1e1e', color: '#fff' }}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Limpar terminal */}
            <button
              onClick={() => setLogs([])}
              title="Limpar tela"
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
            >
              <Trash2 size={16} />
            </button>

            {/* Toggle autoscroll */}
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              title={autoScroll ? 'Desativar rolagem automática' : 'Ativar rolagem automática'}
              style={{ background: 'transparent', border: 'none', color: autoScroll ? '#3ecf8e' : 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
            >
              <ArrowDown size={16} />
            </button>

            {/* Fechar */}
            <button
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Janela de Logs (Monospace Terminal) */}
        <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', background: '#0c0c0c', color: '#e5e7eb', fontSize: '0.8rem', lineHeight: '1.4' }} className="font-mono">
          {logs.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '3rem' }}>
              Aguardando saída de logs dos containers da instância...
            </div>
          ) : (
            logs.map((chunk, index) => (
              <pre key={index} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, padding: 0 }}>
                {chunk}
              </pre>
            ))
          )}
          <div ref={logEndRef} />
        </div>

      </div>

    </div>
  );
};
