import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Key,
  Server,
  Loader2,
  CheckCircle2,
  Zap,
  Clock,
  ShieldCheck,
} from 'lucide-react';

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
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);

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

  // Cronômetro de criação de instância
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    if (isCreating) {
      setElapsedTime(0);
      setIsSuccess(false);
      timer = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isCreating]);

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
      setIsSuccess(true);
      await new Promise((resolve) => setTimeout(resolve, 900));
      setName('');
      setDbPassword('');
      setIsSuccess(false);
      onClose();
    } catch (err: any) {
      setIsSuccess(false);
      setError(err.message || 'Falha ao criar instância.');
    }
  };

  const activeBase = useCustomPort ? portBase : suggestedPort;
  const isBusy = isCreating || isSuccess;

  // Etapas de provisionamento
  const provisioningSteps = [
    {
      title: 'Gerando credenciais criptográficas',
      desc: 'JWT secret, tokens anon/service_role e senhas do Vault',
    },
    {
      title: 'Configurando volumes e rede Docker',
      desc: `Rede isolada supabase_net_${name || 'instancia'} e diretórios`,
    },
    {
      title: 'Orquestrando microserviços Supabase',
      desc: 'PostgreSQL, Kong API, Studio UI, Auth, REST, Storage e Realtime',
    },
    {
      title: 'Inicializando contêineres e validando portas',
      desc: 'Aguardando containers ficarem saudáveis e portas ativas',
    },
  ];

  // Identificar etapa ativa com base no tempo decorrido ou sucesso
  const getCurrentStepIndex = () => {
    if (isSuccess) return 4;
    if (elapsedTime >= 16) return 3;
    if (elapsedTime >= 8) return 2;
    if (elapsedTime >= 3) return 1;
    return 0;
  };

  const currentStepIndex = getCurrentStepIndex();
  const progressPercent = isSuccess ? 100 : Math.min(96, Math.floor(15 + (elapsedTime / 25) * 80));

  const formatElapsed = (sec: number) => {
    if (sec < 60) return `${sec}s`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  const microservices = [
    { name: 'PostgreSQL', port: activeBase },
    { name: 'Kong API', port: activeBase + 1 },
    { name: 'Studio UI', port: activeBase + 3 },
    { name: 'REST API', port: activeBase + 4 },
    { name: 'GoTrue Auth', port: activeBase + 5 },
    { name: 'Storage API', port: activeBase + 6 },
    { name: 'Realtime', port: activeBase + 7 },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: isBusy ? '620px' : '580px',
          padding: '1.75rem',
          position: 'relative',
          transition: 'all 0.3s ease',
          boxShadow: isBusy
            ? '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 35px rgba(62, 207, 142, 0.18)'
            : '0 20px 40px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* ========================================================= */}
        {/* TELA DE ANIMAÇÃO DE PROVISIONAMENTO ATIVO / SUCESSO       */}
        {/* ========================================================= */}
        {isBusy ? (
          <div>
            {/* Header da Animação */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.5rem',
                borderBottom: '1px solid var(--border-subtle)',
                paddingBottom: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    background: isSuccess ? 'rgba(62, 207, 142, 0.25)' : 'rgba(62, 207, 142, 0.15)',
                    padding: '8px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isSuccess ? (
                    <CheckCircle2 size={20} color="#3ecf8e" />
                  ) : (
                    <RefreshCw size={20} color="#3ecf8e" className="animate-spin" />
                  )}
                </div>
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>
                    {isSuccess ? 'Instância Criada com Sucesso!' : 'Provisionando Instância Supabase'}
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {isSuccess
                      ? 'Todos os microserviços foram inicializados'
                      : 'Criando e inicializando contêineres Docker isolados'}
                  </p>
                </div>
              </div>

              {/* Tag de Cronômetro Decorrido */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid var(--border-subtle)',
                  padding: '5px 10px',
                  borderRadius: '20px',
                  fontSize: '0.78rem',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontFamily: 'monospace',
                }}
              >
                <Clock size={14} color="#3ecf8e" />
                <span>{formatElapsed(elapsedTime)}</span>
              </div>
            </div>

            {/* Hub Central Animado (Orbital Glow & Pulse) */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1.5rem 0 1rem 0',
                position: 'relative',
              }}
            >
              {/* Círculo com Animações Orbitais */}
              <div
                style={{
                  position: 'relative',
                  width: '130px',
                  height: '130px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1rem',
                }}
              >
                {/* Ondas de radar se propagando */}
                {!isSuccess && (
                  <>
                    <div
                      className="animate-ripple"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '50%',
                        border: '2px solid rgba(62, 207, 142, 0.4)',
                        pointerEvents: 'none',
                      }}
                    />
                    <div
                      className="animate-ripple"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '50%',
                        border: '1.5px solid rgba(96, 165, 250, 0.3)',
                        animationDelay: '1.2s',
                        pointerEvents: 'none',
                      }}
                    />
                  </>
                )}

                {/* Anel Orbital Externo Rotativo */}
                <div
                  className={isSuccess ? '' : 'animate-spin-clockwise'}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    border: isSuccess ? '2px solid #3ecf8e' : '2px dashed rgba(62, 207, 142, 0.45)',
                    borderTopColor: '#3ecf8e',
                    borderRightColor: '#60a5fa',
                  }}
                />

                {/* Anel Orbital Interno Contra-Rotativo */}
                <div
                  className={isSuccess ? '' : 'animate-spin-counter'}
                  style={{
                    position: 'absolute',
                    inset: '12px',
                    borderRadius: '50%',
                    border: isSuccess ? '1.5px solid #3ecf8e' : '1.5px dotted rgba(62, 207, 142, 0.35)',
                    borderBottomColor: '#3ecf8e',
                  }}
                />

                {/* Núcleo Central Flutuante com Ícone Supabase */}
                <div
                  className={`animate-float ${isSuccess ? '' : 'animate-pulse-glow'}`}
                  style={{
                    position: 'relative',
                    width: '74px',
                    height: '74px',
                    borderRadius: '50%',
                    background: isSuccess
                      ? 'radial-gradient(circle at 35% 35%, #236c4b 0%, #103825 60%, #081a11 100%)'
                      : 'radial-gradient(circle at 35% 35%, #1e4a36 0%, #0e241b 60%, #08140f 100%)',
                    border: '2px solid rgba(62, 207, 142, 0.85)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2,
                  }}
                >
                  {isSuccess ? (
                    <CheckCircle2 size={36} color="#3ecf8e" style={{ filter: 'drop-shadow(0 0 10px #3ecf8e)' }} />
                  ) : (
                    <Zap size={34} color="#3ecf8e" style={{ filter: 'drop-shadow(0 0 8px #3ecf8e)' }} />
                  )}
                </div>
              </div>

              {/* Título da Instância & Info de Portas */}
              <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                    {name || 'supabase-instance'}
                  </span>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      background: 'rgba(62, 207, 142, 0.15)',
                      color: '#3ecf8e',
                      border: '1px solid rgba(62, 207, 142, 0.3)',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontWeight: 600,
                    }}
                  >
                    Base {activeBase}
                  </span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Isolando volumes, rede e alocando portas {activeBase} – {activeBase + 8}
                </p>
              </div>
            </div>

            {/* Barra de Progresso com Efeito Shimmer */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.78rem',
                  marginBottom: '6px',
                }}
              >
                <span style={{ color: 'var(--text-secondary)' }}>
                  {isSuccess ? 'Conclusão' : 'Status da criação'}
                </span>
                <span style={{ color: '#3ecf8e', fontWeight: 600, fontFamily: 'monospace' }}>
                  {progressPercent}%
                </span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: '6px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: '6px',
                  overflow: 'hidden',
                }}
              >
                <div
                  className="shimmer-progress"
                  style={{
                    width: `${progressPercent}%`,
                    height: '100%',
                    borderRadius: '6px',
                    transition: 'width 0.8s ease-in-out',
                  }}
                />
              </div>
            </div>

            {/* Lista de Etapas em Andamento */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem',
                background: 'var(--bg-secondary)',
                padding: '1rem',
                borderRadius: '10px',
                border: '1px solid var(--border-subtle)',
                marginBottom: '1.25rem',
              }}
            >
              {provisioningSteps.map((step, idx) => {
                const isCompleted = isSuccess || idx < currentStepIndex;
                const isCurrent = !isSuccess && idx === currentStepIndex;
                const isPending = !isSuccess && idx > currentStepIndex;

                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      opacity: isPending ? 0.45 : 1,
                      transition: 'all 0.3s ease',
                      padding: isCurrent ? '6px 8px' : '2px 8px',
                      background: isCurrent ? 'rgba(62, 207, 142, 0.06)' : 'transparent',
                      borderRadius: '6px',
                      borderLeft: isCurrent ? '3px solid #3ecf8e' : '3px solid transparent',
                    }}
                  >
                    <div style={{ marginTop: '2px', flexShrink: 0 }}>
                      {isCompleted ? (
                        <CheckCircle2 size={16} color="#3ecf8e" />
                      ) : isCurrent ? (
                        <Loader2 size={16} color="#3ecf8e" className="animate-spin" />
                      ) : (
                        <div
                          style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            border: '1px solid var(--border-subtle)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        />
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: '0.82rem',
                          fontWeight: isCurrent ? 600 : 500,
                          color: isCurrent ? '#fff' : isCompleted ? '#e5e7eb' : 'var(--text-muted)',
                        }}
                      >
                        {step.title}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {step.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Chips de Microserviços sendo criados */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '6px',
                  fontWeight: 600,
                }}
              >
                Microserviços na stack
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {microservices.map((srv) => (
                  <div
                    key={srv.name}
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid var(--border-subtle)',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: '#3ecf8e',
                        boxShadow: '0 0 6px #3ecf8e',
                        display: 'inline-block',
                      }}
                    />
                    <span style={{ color: '#e5e7eb' }}>{srv.name}</span>
                    <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      :{srv.port}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Aviso Informativo ao Usuário */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.75rem',
                color: '#93c5fd',
              }}
            >
              <ShieldCheck size={16} color="#60a5fa" style={{ flexShrink: 0 }} />
              <span>
                O Docker Compose está configurando os volumes e subindo a infraestrutura. Não feche esta janela
                até a conclusão.
              </span>
            </div>
          </div>
        ) : (
          /* ========================================================= */
          /* FORMULÁRIO DE CRIAÇÃO (QUANDO NÃO ESTIVER CRIANDO)       */
          /* ========================================================= */
          <div>
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.5rem',
                borderBottom: '1px solid var(--border-subtle)',
                paddingBottom: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    background: 'rgba(62, 207, 142, 0.1)',
                    padding: '8px',
                    borderRadius: '8px',
                  }}
                >
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
                disabled={isBusy}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  color: '#ef4444',
                  fontSize: '0.85rem',
                  marginBottom: '1.25rem',
                }}
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Nome da Instância */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: '0.4rem',
                  }}
                >
                  Nome da Instância / Projeto <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ex: app-dev, e-commerce, clientes"
                  disabled={isBusy}
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
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    marginTop: '4px',
                    display: 'block',
                  }}
                >
                  Identificador único para containers e volumes Docker (sem espaços).
                </span>

                {/* Preview dos Túneis jcode.api.br */}
                <div
                  style={{
                    marginTop: '0.65rem',
                    background: 'rgba(62, 207, 142, 0.08)',
                    border: '1px solid rgba(62, 207, 142, 0.25)',
                    borderRadius: '8px',
                    padding: '0.65rem 0.85rem',
                    fontSize: '0.8rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: '#3ecf8e',
                      fontWeight: 600,
                      marginBottom: '4px',
                    }}
                  >
                    <Zap size={13} />
                    <span>Túneis Automáticos (jcode.api.br)</span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      color: '#d1d5db',
                    }}
                  >
                    <div>
                      <span style={{ color: '#60a5fa' }}>API: </span>
                      https://{name.trim().toLowerCase() || 'nome'}.jcode.api.br
                    </div>
                    <div>
                      <span style={{ color: '#3ecf8e' }}>Studio: </span>
                      https://{name.trim().toLowerCase() || 'nome'}-studio.jcode.api.br
                    </div>
                  </div>
                </div>
              </div>

              {/* Configuração de Portas */}
              <div
                style={{
                  marginBottom: '1.25rem',
                  background: 'var(--bg-secondary)',
                  padding: '1rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.5rem',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <Server size={14} color="#3ecf8e" />
                    <span>Bloco de Portas (Port Offset)</span>
                  </span>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.75rem',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
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
                  <div
                    style={{
                      fontSize: '0.8rem',
                      color: '#3ecf8e',
                      fontWeight: 600,
                      marginBottom: '0.5rem',
                    }}
                  >
                    Automático sugerido: Base {suggestedPort}
                  </div>
                )}

                {/* Pré-visualização de portas mapeadas */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '0.5rem',
                    fontSize: '0.75rem',
                    background: 'var(--bg-primary)',
                    padding: '0.5rem',
                    borderRadius: '6px',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Postgres:</span>{' '}
                    <b style={{ color: '#3ecf8e' }}>{activeBase}</b>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Kong API:</span>{' '}
                    <b style={{ color: '#60a5fa' }}>{activeBase + 1}</b>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Studio UI:</span>{' '}
                    <b style={{ color: '#3ecf8e' }}>{activeBase + 3}</b>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>REST API:</span>{' '}
                    <b>{activeBase + 4}</b>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Auth:</span>{' '}
                    <b>{activeBase + 5}</b>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Storage:</span>{' '}
                    <b>{activeBase + 6}</b>
                  </div>
                </div>
              </div>

              {/* Senha do Postgres (Opcional) */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.4rem',
                  }}
                >
                  <label
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <Key size={14} color="#f59e0b" />
                    <span>Senha do PostgreSQL (Opcional)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setDbPassword(
                        Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-8)
                      )
                    }
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#3ecf8e',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
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
                  disabled={isBusy}
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
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.85rem',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={startAfter}
                    onChange={(e) => setStartAfter(e.target.checked)}
                    disabled={isBusy}
                  />
                  <span>Iniciar containers Docker automaticamente após criação</span>
                </label>
              </div>

              {/* Botões do Rodapé */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                }}
              >
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isBusy}
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
                  disabled={isBusy}
                  style={{
                    background: 'linear-gradient(135deg, #3ecf8e 0%, #2bb879 100%)',
                    color: '#0d281e',
                    border: 'none',
                    padding: '8px 20px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 10px rgba(62, 207, 142, 0.3)',
                  }}
                >
                  <span>Criar Instância</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
