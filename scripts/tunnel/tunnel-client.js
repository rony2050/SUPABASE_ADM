const WebSocket = require('ws');
const http = require('http');

class TunnelClient {
  constructor(options = {}) {
    this.name = options.name || 'Tunnel';
    this.serverUrl = options.serverUrl || 'wss://jcode.api.br';
    this.localHost = options.localHost || '127.0.0.1';
    this.localPort = options.localPort || 8000;
    this.customTunnelId = options.customTunnelId || '';
    this.authToken = options.authToken || '';
    
    this.ws = null;
    this.tunnelInfo = null;
    this.reconnectAttempts = 0;
    this.isManuallyClosed = false;
    this.reconnectTimer = null;
  }

  log(level, msg) {
    const time = new Date().toISOString().substring(11, 19);
    console.log(`[${time}] [${this.name}] [${level}] ${msg}`);
  }

  connect() {
    if (this.isManuallyClosed) return;

    let wsUrl = this.serverUrl;
    if (wsUrl.startsWith('http://')) wsUrl = wsUrl.replace('http://', 'ws://');
    if (wsUrl.startsWith('https://')) wsUrl = wsUrl.replace('https://', 'wss://');
    if (!wsUrl.includes('/ws') && !wsUrl.includes('/api/tunnel')) {
      wsUrl = wsUrl.replace(/\/+$/, '') + '/ws';
    }

    const urlObj = new URL(wsUrl);
    if (this.customTunnelId) {
      urlObj.searchParams.set('id', this.customTunnelId);
    }
    if (this.authToken) {
      urlObj.searchParams.set('token', this.authToken);
    }

    this.log('INFO', `Conectando a ${urlObj.origin} (id: ${this.customTunnelId})...`);

    try {
      this.ws = new WebSocket(urlObj.toString());

      this.ws.on('open', () => {
        this.reconnectAttempts = 0;
        this.log('SUCCESS', `Conexão WebSocket ativa! Destino local: http://${this.localHost}:${this.localPort}`);

        // Heartbeat periódico (15s) para manter túnel ativo no Cloudflare/Render
        clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'PING' }));
          }
        }, 15000);
      });

      this.ws.on('ping', () => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.pong();
        }
      });

      this.ws.on('message', (data) => {
        this.handleServerMessage(data);
      });

      this.ws.on('close', (code, reason) => {
        clearInterval(this.pingInterval);
        const reasonStr = reason ? reason.toString() : '';
        if (!this.isManuallyClosed) {
          this.log('WARN', `Conexão fechada (${code} ${reasonStr}). Reconectando...`);
          this.scheduleReconnect();
        }
      });

      this.ws.on('error', (err) => {
        clearInterval(this.pingInterval);
        this.log('ERROR', `Erro de socket: ${err.message}`);
      });
    } catch (err) {
      clearInterval(this.pingInterval);
      this.log('ERROR', `Falha ao conectar: ${err.message}`);
      this.scheduleReconnect();
    }
  }

  handleServerMessage(rawMessage) {
    try {
      const message = JSON.parse(rawMessage.toString());

      switch (message.type) {
        case 'INIT_SUCCESS':
          this.tunnelInfo = message;
          this.log('SUCCESS', `Túnel público online: ${message.publicUrl} -> http://${this.localHost}:${this.localPort}`);
          break;

        case 'HTTP_REQUEST':
          this.handleForwardRequest(message);
          break;

        case 'PONG':
          break;

        default:
          break;
      }
    } catch (err) {
      this.log('ERROR', `Erro ao decodificar mensagem: ${err.message}`);
    }
  }

  async handleForwardRequest(requestData) {
    const { requestId, method, path, headers, body, isBase64 } = requestData;

    let payloadBuffer = null;
    if (body) {
      payloadBuffer = isBase64 ? Buffer.from(body, 'base64') : Buffer.from(body);
    }

    const forwardHeaders = { ...headers };
    forwardHeaders.host = `${this.localHost}:${this.localPort}`;
    if (payloadBuffer) {
      forwardHeaders['content-length'] = payloadBuffer.length;
    } else {
      delete forwardHeaders['content-length'];
    }

    const requestOptions = {
      hostname: this.localHost,
      port: this.localPort,
      path: path,
      method: method,
      headers: forwardHeaders,
    };

    const req = http.request(requestOptions, (localRes) => {
      const chunks = [];

      localRes.on('data', (chunk) => {
        chunks.push(chunk);
      });

      localRes.on('end', () => {
        const responseBodyBuffer = Buffer.concat(chunks);
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({
            type: 'HTTP_RESPONSE',
            requestId,
            statusCode: localRes.statusCode,
            headers: localRes.headers,
            body: responseBodyBuffer.toString('base64'),
            isBase64: true,
          }));
        }
      });
    });

    req.on('error', (err) => {
      this.log('WARN', `Servidor local [${method} ${path}] offline ou erro: ${err.message}`);
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'HTTP_RESPONSE',
          requestId,
          statusCode: 502,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            error: 'Local Server Error',
            message: `Serviço local em http://${this.localHost}:${this.localPort} indisponível.`,
            details: err.message,
          }),
          isBase64: false,
        }));
      }
    });

    req.setTimeout(30000, () => {
      req.destroy(new Error('Timeout de 30s aguardando o serviço local'));
    });

    if (payloadBuffer) {
      req.write(payloadBuffer);
    }
    req.end();
  }

  scheduleReconnect() {
    if (this.isManuallyClosed) return;

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  close() {
    this.isManuallyClosed = true;
    clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close(1000, 'Client closed');
    }
    this.log('INFO', 'Túnel encerrado.');
  }
}

module.exports = TunnelClient;
