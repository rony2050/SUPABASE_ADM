import React, { useState } from 'react';
import { X, Copy, Check, Eye, EyeOff, ShieldCheck, Database, Globe } from 'lucide-react';
import { InstanceCredentials } from '../types';

interface CredentialsModalProps {
  credentials: InstanceCredentials | null;
  onClose: () => void;
}

export const CredentialsModal: React.FC<CredentialsModalProps> = ({ credentials, onClose }) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showServiceRole, setShowServiceRole] = useState(false);
  const [showDbPassword, setShowDbPassword] = useState(false);
  const [showJwtSecret, setShowJwtSecret] = useState(false);

  if (!credentials) return null;

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      
      <div className="glass-panel" style={{ width: '100%', maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem', position: 'relative' }}>
        
        {/* Header do Modal */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '8px', borderRadius: '8px' }}>
              <ShieldCheck size={20} color="#f59e0b" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
                Credenciais & Chaves da Instância
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Instância: <span style={{ color: '#3ecf8e', fontWeight: 600 }}>{credentials.name}</span>
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

        {/* Seção 1: Chaves de API */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>CHAVES DE API (JWT)</span>
          </h4>

          {/* Anon Key */}
          <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-subtle)', padding: '0.85rem', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                anon key (Pública / Frontend)
              </span>
              <button
                onClick={() => copyToClipboard(credentials.anonKey, 'anon')}
                style={{ background: 'transparent', border: 'none', color: copiedField === 'anon' ? '#10b981' : 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}
              >
                {copiedField === 'anon' ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedField === 'anon' ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#3ecf8e', wordBreak: 'break-all' }} className="font-mono">
              {credentials.anonKey}
            </div>
          </div>

          {/* Service Role Key */}
          <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-subtle)', padding: '0.85rem', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}>
                service_role key (Privada / Bypass RLS)
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  onClick={() => setShowServiceRole(!showServiceRole)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}
                >
                  {showServiceRole ? <EyeOff size={13} /> : <Eye size={13} />}
                  <span>{showServiceRole ? 'Ocultar' : 'Revelar'}</span>
                </button>
                <button
                  onClick={() => copyToClipboard(credentials.serviceRoleKey, 'service')}
                  style={{ background: 'transparent', border: 'none', color: copiedField === 'service' ? '#10b981' : 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}
                >
                  {copiedField === 'service' ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copiedField === 'service' ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#f87171', wordBreak: 'break-all' }} className="font-mono">
              {showServiceRole ? credentials.serviceRoleKey : '•'.repeat(48)}
            </div>
          </div>

          {/* JWT Secret */}
          <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-subtle)', padding: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                JWT Secret
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  onClick={() => setShowJwtSecret(!showJwtSecret)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}
                >
                  {showJwtSecret ? <EyeOff size={13} /> : <Eye size={13} />}
                  <span>{showJwtSecret ? 'Ocultar' : 'Revelar'}</span>
                </button>
                <button
                  onClick={() => copyToClipboard(credentials.jwtSecret, 'jwt')}
                  style={{ background: 'transparent', border: 'none', color: copiedField === 'jwt' ? '#10b981' : 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}
                >
                  {copiedField === 'jwt' ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copiedField === 'jwt' ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#fbbf24', wordBreak: 'break-all' }} className="font-mono">
              {showJwtSecret ? credentials.jwtSecret : '•'.repeat(32)}
            </div>
          </div>
        </div>

        {/* Seção 2: Banco de Dados PostgreSQL */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Database size={15} color="#c084fc" />
            <span>CONEXÃO POSTGRESQL</span>
          </h4>

          {/* Connection URI */}
          <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-subtle)', padding: '0.85rem', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                Connection URI (Prisma, Drizzle, psql)
              </span>
              <button
                onClick={() => copyToClipboard(credentials.connectionString, 'uri')}
                style={{ background: 'transparent', border: 'none', color: copiedField === 'uri' ? '#10b981' : 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}
              >
                {copiedField === 'uri' ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedField === 'uri' ? 'Copiado!' : 'Copiar URI'}</span>
              </button>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#c084fc', wordBreak: 'break-all' }} className="font-mono">
              {credentials.connectionString}
            </div>
          </div>

          {/* Senha do Postgres */}
          <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-subtle)', padding: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                Senha do usuário postgres
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  onClick={() => setShowDbPassword(!showDbPassword)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}
                >
                  {showDbPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                  <span>{showDbPassword ? 'Ocultar' : 'Revelar'}</span>
                </button>
                <button
                  onClick={() => copyToClipboard(credentials.postgresPassword, 'dbpass')}
                  style={{ background: 'transparent', border: 'none', color: copiedField === 'dbpass' ? '#10b981' : 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}
                >
                  {copiedField === 'dbpass' ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copiedField === 'dbpass' ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#fff', wordBreak: 'break-all' }} className="font-mono">
              {showDbPassword ? credentials.postgresPassword : '•'.repeat(20)}
            </div>
          </div>
        </div>

        {/* Seção 3: Endpoints e URLs */}
        <div>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Globe size={15} color="#60a5fa" />
            <span>ENDPOINTS HTTP & WEBSOCKETS</span>
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.5rem', fontSize: '0.75rem' }}>
            <div style={{ background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ color: 'var(--text-muted)' }}>Studio Web UI:</div>
              <div style={{ color: '#3ecf8e', fontWeight: 600 }} className="font-mono">{credentials.urls.studio}</div>
            </div>
            <div style={{ background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ color: 'var(--text-muted)' }}>Kong API Gateway:</div>
              <div style={{ color: '#60a5fa', fontWeight: 600 }} className="font-mono">{credentials.urls.api}</div>
            </div>
            <div style={{ background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ color: 'var(--text-muted)' }}>REST API (PostgREST):</div>
              <div style={{ color: '#fff', fontWeight: 500 }} className="font-mono">{credentials.urls.rest}</div>
            </div>
            <div style={{ background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ color: 'var(--text-muted)' }}>Auth API (GoTrue):</div>
              <div style={{ color: '#fff', fontWeight: 500 }} className="font-mono">{credentials.urls.auth}</div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
