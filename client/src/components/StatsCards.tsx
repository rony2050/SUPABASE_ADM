import React from 'react';
import { Layers, PlayCircle, Box, Activity } from 'lucide-react';
import { InstanceSummary, SystemInfo } from '../types';

interface StatsCardsProps {
  instances: InstanceSummary[];
  systemInfo: SystemInfo | null;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ instances, systemInfo }) => {
  const total = instances.length;
  const running = instances.filter((i) => i.status === 'running').length;
  const partial = instances.filter((i) => i.status === 'partial').length;
  const stopped = instances.filter((i) => i.status === 'stopped').length;

  let totalActiveContainers = 0;
  instances.forEach((inst) => {
    inst.services.forEach((s) => {
      if (s.state === 'running') totalActiveContainers++;
    });
  });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
      
      {/* Card 1: Total Instâncias */}
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            Total de Instâncias
          </span>
          <div style={{ background: 'rgba(62, 207, 142, 0.1)', padding: '6px', borderRadius: '8px' }}>
            <Layers size={18} color="#3ecf8e" />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.8rem', fontWeight: 700, color: '#fff' }}>{total}</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>configuradas</span>
        </div>
        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          {total === 0 ? 'Nenhuma instância criada' : `${total} instâncias gerenciadas`}
        </div>
      </div>

      {/* Card 2: Status Operacional */}
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            Em Execução
          </span>
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '6px', borderRadius: '8px' }}>
            <PlayCircle size={18} color="#10b981" />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.8rem', fontWeight: 700, color: '#10b981' }}>{running}</span>
          {partial > 0 && (
            <span style={{ fontSize: '0.85rem', color: '#f59e0b', fontWeight: 600 }}>({partial} parcial)</span>
          )}
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/ {total} ativas</span>
        </div>
        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          {stopped > 0 ? `${stopped} instâncias paradas` : 'Todas as instâncias operacionais'}
        </div>
      </div>

      {/* Card 3: Containers Ativos */}
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            Containers Supabase
          </span>
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '6px', borderRadius: '8px' }}>
            <Box size={18} color="#3b82f6" />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.8rem', fontWeight: 700, color: '#fff' }}>
            {totalActiveContainers}
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>containers ativos</span>
        </div>
        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          Postgres, Kong, GoTrue, Studio, etc.
        </div>
      </div>

      {/* Card 4: Memória e Host */}
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            Uso de Recursos (Host)
          </span>
          <div style={{ background: 'rgba(168, 85, 247, 0.1)', padding: '6px', borderRadius: '8px' }}>
            <Activity size={18} color="#a855f7" />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.8rem', fontWeight: 700, color: '#fff' }}>
            {systemInfo ? `${systemInfo.usedMemoryPercent}%` : '--'}
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>RAM ocupada</span>
        </div>
        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          {systemInfo ? `${systemInfo.cpuCount} CPUs disponíveis` : 'Carregando dados...'}
        </div>
      </div>

    </div>
  );
};
