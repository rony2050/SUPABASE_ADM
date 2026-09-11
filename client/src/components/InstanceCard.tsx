import React from 'react';
import {
  ExternalLink,
  Key,
  Terminal,
  Play,
  Square,
  RotateCw,
  Database,
  Trash2,
  Check,
  AlertTriangle,
  Clock,
  FileCode,
} from 'lucide-react';
import { InstanceSummary } from '../types';

interface InstanceCardProps {
  instance: InstanceSummary;
  onOpenCredentials: (name: string) => void;
  onOpenLogs: (name: string) => void;
  onOpenConfig: (name: string) => void;
  onStart: (name: string) => void;
  onStop: (name: string) => void;
  onRestart: (name: string) => void;
  onBackup: (name: string) => void;
  onDestroy: (name: string) => void;
  isActionPending: boolean;
}

export const InstanceCard: React.FC<InstanceCardProps> = ({
  instance,
  onOpenCredentials,
  onOpenLogs,
  onOpenConfig,
  onStart,
  onStop,
  onRestart,
  onBackup,
  onDestroy,
  isActionPending,
}) => {
  const isRunning = instance.status === 'running';
  const isPartial = instance.status === 'partial';
  const isStopped = instance.status === 'stopped';

  // Format creation date
  const createdDate = new Date(instance.createdAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="glass-panel glass-panel-glow" style={{ padding: '1.5rem', position: 'relative' }}>
      
      {/* Header do Card */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.01em' }}>
              {instance.name}
            </h3>

            {/* Badge de Status */}
            {isRunning && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '2px 8px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600 }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} className="animate-pulse-slow" />
                ONLINE
              </span>
            )}
            {isPartial && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '2px 8px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600 }}>
                <AlertTriangle size={11} />
                PARCIAL
              </span>
            )}
            {isStopped && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '2px 8px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600 }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }} />
                OFFLINE
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            <Clock size={12} />
            <span>Criada em {createdDate}</span>
          </div>
        </div>

        {/* Botão Abrir Studio Web */}
        {isRunning && (
          <a
            href={instance.urls.studioUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(62, 207, 142, 0.15)',
              color: '#3ecf8e',
              border: '1px solid rgba(62, 207, 142, 0.4)',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <span>Abrir Studio</span>
            <ExternalLink size={13} />
          </a>
        )}
      </div>

      {/* Grid de Portas Principais */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div style={{ background: 'var(--bg-secondary)', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Studio Port
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 600, color: '#3ecf8e', marginTop: '2px' }} className="font-mono">
            {instance.ports.studio}
          </div>
        </div>

        <div style={{ background: 'var(--bg-secondary)', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Kong API
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 600, color: '#60a5fa', marginTop: '2px' }} className="font-mono">
            {instance.ports.kongHttp}
          </div>
        </div>

        <div style={{ background: 'var(--bg-secondary)', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Postgres DB
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 600, color: '#c084fc', marginTop: '2px' }} className="font-mono">
            {instance.ports.postgres}
          </div>
        </div>
      </div>

      {/* Grid de Microserviços Supabase */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 500 }}>
          Microserviços da Instância ({instance.services.filter((s) => s.state === 'running').length}/{instance.services.length} ativos):
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {instance.services.map((svc) => {
            const isSvcUp = svc.state === 'running';
            return (
              <div
                key={svc.name}
                title={`${svc.containerName} - ${svc.status}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: isSvcUp ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.04)',
                  color: isSvcUp ? '#10b981' : 'var(--text-muted)',
                  border: `1px solid ${isSvcUp ? 'rgba(16, 185, 129, 0.25)' : 'var(--border-subtle)'}`,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                }}
              >
                {isSvcUp ? <Check size={11} strokeWidth={3} /> : <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#666' }} />}
                <span style={{ fontWeight: 500 }}>{svc.name.toUpperCase()}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Barra de Ações Rápidas */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        
        {/* Ações Informativas */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={() => onOpenCredentials(instance.name)}
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <Key size={13} color="#f59e0b" />
            <span>Credenciais</span>
          </button>

          <button
            onClick={() => onOpenLogs(instance.name)}
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <Terminal size={13} color="#3b82f6" />
            <span>Logs</span>
          </button>

          <button
            onClick={() => onBackup(instance.name)}
            title="Exportar dump SQL do banco de dados"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <Database size={13} color="#a855f7" />
            <span>Backup</span>
          </button>

          <button
            onClick={() => onOpenConfig(instance.name)}
            title="Editar arquivo config.toml da instância"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <FileCode size={13} color="#60a5fa" />
            <span>Config</span>
          </button>
        </div>

        {/* Controles de Ciclo de Vida */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {isRunning ? (
            <button
              onClick={() => onStop(instance.name)}
              disabled={isActionPending}
              title="Parar instância"
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Square size={12} fill="#ef4444" />
              <span>Parar</span>
            </button>
          ) : (
            <button
              onClick={() => onStart(instance.name)}
              disabled={isActionPending}
              title="Iniciar instância"
              style={{
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#10b981',
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Play size={12} fill="#10b981" />
              <span>Iniciar</span>
            </button>
          )}

          <button
            onClick={() => onRestart(instance.name)}
            disabled={isActionPending}
            title="Reiniciar todos os containers desta instância"
            style={{
              background: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              color: '#60a5fa',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <RotateCw size={12} />
            <span>Reiniciar</span>
          </button>

          <button
            onClick={() => onDestroy(instance.name)}
            disabled={isActionPending}
            title="Destruir instância"
            style={{
              background: 'transparent',
              border: '1px solid transparent',
              color: '#ef4444',
              padding: '6px 8px',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>

      </div>

    </div>
  );
};
