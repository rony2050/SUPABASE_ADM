import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Layers, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Header } from './components/Header';
import { StatsCards } from './components/StatsCards';
import { InstanceCard } from './components/InstanceCard';
import { CredentialsModal } from './components/CredentialsModal';
import { LogsModal } from './components/LogsModal';
import { CreateInstanceModal } from './components/CreateInstanceModal';
import { InstanceSummary, InstanceCredentials, SystemInfo } from './types';

export const App: React.FC = () => {
  const [instances, setInstances] = useState<InstanceSummary[]>([]);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'running' | 'stopped'>('all');
  
  // Modais
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [selectedCredentials, setSelectedCredentials] = useState<InstanceCredentials | null>(null);
  const [selectedLogsInstance, setSelectedLogsInstance] = useState<string | null>(null);
  const [destroyModalInstance, setDestroyModalInstance] = useState<string | null>(null);
  const [deleteVolumes, setDeleteVolumes] = useState<boolean>(true);

  // Ações pendentes
  const [isActionPending, setIsActionPending] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);

  // Notificações Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Carregar dados
  const fetchData = useCallback(async (quiet: boolean = false) => {
    if (!quiet) setIsLoading(true);
    try {
      const [instRes, sysRes] = await Promise.all([
        fetch('/api/instances').then((r) => r.json()),
        fetch('/api/system/info').then((r) => r.json()),
      ]);

      if (instRes.success) {
        setInstances(instRes.data);
      }
      if (sysRes.success) {
        setSystemInfo(sysRes.data);
      }
    } catch {
      if (!quiet) {
        showToast('Não foi possível conectar à API do Supabase Manager.', 'error');
      }
    } finally {
      if (!quiet) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData(true);
    }, 6000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Ações nas instâncias
  const handleInstanceAction = async (name: string, action: 'start' | 'stop' | 'restart') => {
    setIsActionPending(true);
    try {
      const res = await fetch(`/api/instances/${name}/${action}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast(`Instância '${name}': ${action} executado com sucesso!`, 'success');
        fetchData(true);
      } else {
        showToast(data.error || 'Erro na operação.', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsActionPending(false);
    }
  };

  const handleOpenCredentials = async (name: string) => {
    try {
      const res = await fetch(`/api/instances/${name}/credentials`);
      const data = await res.json();
      if (data.success) {
        setSelectedCredentials(data.data);
      } else {
        showToast(data.error, 'error');
      }
    } catch (err: any) {
      showToast('Falha ao obter credenciais.', 'error');
    }
  };

  const handleBackup = async (name: string) => {
    setIsActionPending(true);
    showToast(`Iniciando backup do banco de dados da instância '${name}'...`, 'info');
    try {
      const res = await fetch(`/api/instances/${name}/backup`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast(`Backup concluído! Arquivo: ${data.data.backupFile}`, 'success');
      } else {
        showToast(data.error || 'Erro ao realizar backup.', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsActionPending(false);
    }
  };

  const handleConfirmDestroy = async () => {
    if (!destroyModalInstance) return;
    setIsActionPending(true);
    try {
      const res = await fetch(`/api/instances/${destroyModalInstance}/destroy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keepVolumes: !deleteVolumes }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Instância '${destroyModalInstance}' removida com sucesso!`, 'success');
        setDestroyModalInstance(null);
        fetchData(true);
      } else {
        showToast(data.error || 'Erro ao remover instância.', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsActionPending(false);
    }
  };

  const handleCreateInstance = async (params: {
    name: string;
    portBase?: number;
    dbPassword?: string;
    startAfter: boolean;
  }) => {
    setIsCreating(true);
    try {
      const res = await fetch('/api/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Instância '${params.name}' criada com sucesso!`, 'success');
        fetchData(true);
      } else {
        throw new Error(data.error || 'Erro ao criar instância.');
      }
    } finally {
      setIsCreating(false);
    }
  };

  // Filtragem de instâncias
  const filteredInstances = instances.filter((inst) => {
    const matchesSearch = inst.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (statusFilter === 'running') return inst.status === 'running';
    if (statusFilter === 'stopped') return inst.status === 'stopped';
    return true;
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: toast.type === 'success' ? '#064e3b' : toast.type === 'error' ? '#7f1d1d' : '#1e293b',
            color: '#fff',
            border: `1px solid ${toast.type === 'success' ? '#10b981' : toast.type === 'error' ? '#ef4444' : '#3b82f6'}`,
            padding: '12px 20px',
            borderRadius: '10px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            fontSize: '0.85rem',
            animation: 'fadeIn 0.2s ease-in',
          }}
        >
          {toast.type === 'success' ? <CheckCircle2 size={18} color="#34d399" /> : toast.type === 'error' ? <AlertCircle size={18} color="#f87171" /> : <Layers size={18} color="#60a5fa" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <Header
        systemInfo={systemInfo}
        onRefresh={() => fetchData(false)}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        isLoading={isLoading}
      />

      {/* Conteúdo Principal */}
      <main style={{ maxWidth: '1400px', width: '100%', margin: '0 auto', padding: '2rem 1.5rem', flex: 1 }}>
        
        {/* Cards de Métricas */}
        <StatsCards instances={instances} systemInfo={systemInfo} />

        {/* Barra de Filtro e Busca */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Input de Busca */}
            <div style={{ position: 'relative', minWidth: '260px' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Filtrar por nome da instância..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '7px 12px 7px 34px',
                  color: '#fff',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              />
            </div>

            {/* Abas de Status */}
            <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <button
                onClick={() => setStatusFilter('all')}
                style={{
                  background: statusFilter === 'all' ? 'var(--bg-tertiary)' : 'transparent',
                  color: statusFilter === 'all' ? '#fff' : 'var(--text-muted)',
                  border: 'none',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Todas ({instances.length})
              </button>
              <button
                onClick={() => setStatusFilter('running')}
                style={{
                  background: statusFilter === 'running' ? 'var(--bg-tertiary)' : 'transparent',
                  color: statusFilter === 'running' ? '#10b981' : 'var(--text-muted)',
                  border: 'none',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Ativas ({instances.filter((i) => i.status === 'running').length})
              </button>
              <button
                onClick={() => setStatusFilter('stopped')}
                style={{
                  background: statusFilter === 'stopped' ? 'var(--bg-tertiary)' : 'transparent',
                  color: statusFilter === 'stopped' ? '#ef4444' : 'var(--text-muted)',
                  border: 'none',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Paradas ({instances.filter((i) => i.status === 'stopped').length})
              </button>
            </div>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Exibindo {filteredInstances.length} de {instances.length} instâncias
          </div>
        </div>

        {/* Lista / Grid de Instâncias */}
        {filteredInstances.length === 0 ? (
          <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(62, 207, 142, 0.1)', color: '#3ecf8e', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
              <Layers size={24} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff', marginBottom: '0.5rem' }}>
              {instances.length === 0 ? 'Nenhuma instância Supabase configurada' : 'Nenhuma instância corresponde ao filtro'}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '460px', margin: '0 auto 1.5rem auto' }}>
              {instances.length === 0
                ? 'Crie sua primeira instância local do Supabase via Docker para inicializar os bancos Postgres, Kong API, Studio e autenticação.'
                : 'Tente limpar os termos de busca ou mudar a aba de status para localizar instâncias.'}
            </p>
            {instances.length === 0 && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                style={{
                  background: 'linear-gradient(135deg, #3ecf8e 0%, #2bb879 100%)',
                  color: '#0d281e',
                  border: 'none',
                  padding: '9px 18px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.85rem',
                }}
              >
                <Plus size={16} />
                <span>Criar Primeira Instância</span>
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '1.25rem' }}>
            {filteredInstances.map((instance) => (
              <InstanceCard
                key={instance.name}
                instance={instance}
                onOpenCredentials={handleOpenCredentials}
                onOpenLogs={(name) => setSelectedLogsInstance(name)}
                onStart={(name) => handleInstanceAction(name, 'start')}
                onStop={(name) => handleInstanceAction(name, 'stop')}
                onRestart={(name) => handleInstanceAction(name, 'restart')}
                onBackup={handleBackup}
                onDestroy={(name) => setDestroyModalInstance(name)}
                isActionPending={isActionPending}
              />
            ))}
          </div>
        )}

      </main>

      {/* Modal de Credenciais */}
      <CredentialsModal
        credentials={selectedCredentials}
        onClose={() => setSelectedCredentials(null)}
      />

      {/* Modal de Terminal de Logs */}
      <LogsModal
        instanceName={selectedLogsInstance}
        onClose={() => setSelectedLogsInstance(null)}
      />

      {/* Modal de Criar Nova Instância */}
      <CreateInstanceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateInstance}
        isCreating={isCreating}
      />

      {/* Modal de Confirmação de Exclusão */}
      {destroyModalInstance && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '460px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', padding: '10px', borderRadius: '10px' }}>
                <ShieldAlert size={24} color="#ef4444" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                  Destruir Instância?
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Ação irreversível para <b style={{ color: '#ef4444' }}>{destroyModalInstance}</b>
                </p>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: '1.4' }}>
              Todos os containers da instância serão parados e removidos imediatamente.
            </p>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#f87171', marginBottom: '1.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={deleteVolumes}
                onChange={(e) => setDeleteVolumes(e.target.checked)}
              />
              <span>Apagar também os volumes Docker (perda total de dados do Postgres)</span>
            </label>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                onClick={() => setDestroyModalInstance(null)}
                disabled={isActionPending}
                style={{ background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDestroy}
                disabled={isActionPending}
                style={{ background: '#dc2626', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
              >
                {isActionPending ? 'Removendo...' : 'Sim, Destruir Instância'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rodapé */}
      <footer style={{ borderTop: '1px solid var(--border-subtle)', padding: '1.25rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        Supabase Local Instance Manager • Arquitetura multi-tenant Docker para Linux • Pronto para produção local & CI/CD
      </footer>

    </div>
  );
};

export default App;
