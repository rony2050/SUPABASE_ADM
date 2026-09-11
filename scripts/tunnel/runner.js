const TunnelClient = require('./tunnel-client');

const serverUrl = process.env.TUNNEL_SERVER || 'wss://jcode.api.br';
const authToken = process.env.TUNNEL_AUTH_TOKEN || 'user_token_abc';

const apiTunnelId = process.env.API_TUNNEL_ID || process.argv[2] || '';
const apiTargetHost = process.env.API_TARGET_HOST || 'kong';
const apiTargetPort = parseInt(process.env.API_TARGET_PORT || '8000', 10);

const studioTunnelId = process.env.STUDIO_TUNNEL_ID || (apiTunnelId ? `${apiTunnelId}-studio` : '');
const studioTargetHost = process.env.STUDIO_TARGET_HOST || 'studio';
const studioTargetPort = parseInt(process.env.STUDIO_TARGET_PORT || '3000', 10);

if (!apiTunnelId) {
  console.error('[ERRO] API_TUNNEL_ID não foi definido.');
  process.exit(1);
}

console.log('====================================================');
console.log('🚀 Supabase Dual Tunnel Runner (jcode.api.br)');
console.log(`🌐 Servidor:   ${serverUrl}`);
console.log(`🔑 Auth Token: ${authToken ? authToken.slice(0, 4) + '***' : 'Nenhum'}`);
console.log(`📡 API Tunnel:    https://${apiTunnelId}.jcode.api.br -> http://${apiTargetHost}:${apiTargetPort}`);
console.log(`🎨 Studio Tunnel: https://${studioTunnelId}.jcode.api.br -> http://${studioTargetHost}:${studioTargetPort}`);
console.log('====================================================\n');

// 1. Iniciar túnel da API Supabase (Kong)
const apiTunnel = new TunnelClient({
  name: 'API-Tunnel',
  serverUrl,
  authToken,
  customTunnelId: apiTunnelId,
  localHost: apiTargetHost,
  localPort: apiTargetPort,
});
apiTunnel.connect();

// 2. Iniciar túnel do Studio Web UI
const studioTunnel = new TunnelClient({
  name: 'Studio-Tunnel',
  serverUrl,
  authToken,
  customTunnelId: studioTunnelId,
  localHost: studioTargetHost,
  localPort: studioTargetPort,
});
studioTunnel.connect();

// Encerramento gracioso
function shutdown() {
  console.log('\n[INFO] Encerrando túneis do Supabase...');
  apiTunnel.close();
  studioTunnel.close();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
