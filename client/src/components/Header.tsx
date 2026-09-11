import React from 'react';
import { Plus, RefreshCw, Server, Cpu, CheckCircle2, XCircle } from 'lucide-react';
import { SystemInfo } from '../types';

interface HeaderProps {
  systemInfo: SystemInfo | null;
  onRefresh: () => void;
  onOpenCreateModal: () => void;
  isLoading: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  systemInfo,
  onRefresh,
  onOpenCreateModal,
  isLoading,
}) => {
  return (
    <header style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(18, 18, 18, 0.85)', backdropFilter: 'blur(10px)' }} className="sticky top-0 z-40 px-6 py-4">
      <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        
        {/* Logo e Título */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ background: 'linear-gradient(135deg, #3ecf8e 0%, #194f38 100%)', width: '42px', height: '42px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(62, 207, 142, 0.3)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#121212">
              <path d="M21.362 9.354H12V.396a.396.396 0 0 0-.716-.233L.32 14.397a.396.396 0 0 0 .307.637H12v8.57a.396.396 0 0 0 .716.233l10.963-14.234a.396.396 0 0 0-.317-.649z" />
            </svg>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#fff' }}>
                Supabase Local Manager
              </h1>
              <span style={{ fontSize: '0.7rem', background: 'rgba(62, 207, 142, 0.15)', color: '#3ecf8e', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                Linux Docker
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Gerenciamento multi-instâncias locais e isoladas
            </p>
          </div>
        </div>

        {/* Telemetria do Host e Ações */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {systemInfo && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8rem', background: 'var(--bg-secondary)', padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)' }}>
                <Server size={14} color="#3ecf8e" />
                <span>{systemInfo.hostname}</span>
              </div>
              <div style={{ width: '1px', height: '14px', background: 'var(--border-subtle)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                {systemInfo.dockerAvailable ? (
                  <>
                    <CheckCircle2 size={14} color="#10b981" />
                    <span style={{ color: '#10b981' }}>Docker Ativo</span>
                  </>
                ) : (
                  <>
                    <XCircle size={14} color="#ef4444" />
                    <span style={{ color: '#ef4444' }}>Docker Offline</span>
                  </>
                )}
              </div>
              <div style={{ width: '1px', height: '14px', background: 'var(--border-subtle)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)' }}>
                <Cpu size={14} color="#60a5fa" />
                <span>RAM: {systemInfo.usedMemoryPercent}% ({Math.round((systemInfo.totalMemoryMb - systemInfo.freeMemoryMb) / 1024)}GB / {Math.round(systemInfo.totalMemoryMb / 1024)}GB)</span>
              </div>
            </div>
          )}

          {/* Botão Atualizar */}
          <button
            onClick={onRefresh}
            title="Atualizar status"
            disabled={isLoading}
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              padding: '8px 12px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.85rem',
            }}
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
            <span>Atualizar</span>
          </button>

          {/* Botão Criar Instância */}
          <button
            onClick={onOpenCreateModal}
            style={{
              background: 'linear-gradient(135deg, #3ecf8e 0%, #2bb879 100%)',
              color: '#0d281e',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.85rem',
              boxShadow: '0 2px 10px rgba(62, 207, 142, 0.3)',
            }}
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Nova Instância</span>
          </button>
        </div>

      </div>
    </header>
  );
};
