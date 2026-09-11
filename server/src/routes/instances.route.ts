import { Router, Request, Response } from 'express';
import { instanceService } from '../services/instance.service';

const router = Router();

// Listar todas as instâncias
router.get('/', async (_req: Request, res: Response) => {
  try {
    const instances = await instanceService.listInstances();
    res.json({ success: true, data: instances });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Sugerir próximo bloco de portas livre
router.get('/next-port', async (_req: Request, res: Response) => {
  try {
    const port = await instanceService.getNextAvailablePort();
    res.json({ success: true, portBase: port });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Obter credenciais e chaves de uma instância
router.get('/:name/credentials', (req: Request, res: Response) => {
  try {
    const creds = instanceService.getCredentials(req.params.name);
    res.json({ success: true, data: creds });
  } catch (err: any) {
    res.status(404).json({ success: false, error: err.message });
  }
});

// Criar nova instância
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, portBase, dbPassword, startAfter } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'O nome da instância é obrigatório.' });
    }
    const result = await instanceService.createInstance({
      name,
      portBase: portBase ? parseInt(portBase, 10) : undefined,
      dbPassword,
      startAfter,
    });
    res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Executar ação de controle (start, stop, restart, destroy)
router.post('/:name/:action', async (req: Request, res: Response) => {
  const { name, action } = req.params;
  try {
    let result = '';
    switch (action) {
      case 'start':
        result = await instanceService.startInstance(name);
        break;
      case 'stop':
        result = await instanceService.stopInstance(name);
        break;
      case 'restart':
        result = await instanceService.restartInstance(name);
        break;
      case 'destroy':
        const keepVolumes = req.body?.keepVolumes === true;
        result = await instanceService.destroyInstance(name, keepVolumes);
        break;
      default:
        return res.status(400).json({ success: false, error: `Ação inválida: ${action}` });
    }
    res.json({ success: true, message: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Fazer backup do banco de dados (pg_dump)
router.post('/:name/backup', async (req: Request, res: Response) => {
  try {
    const result = await instanceService.backupDatabase(req.params.name);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Stream de logs em tempo real via Server-Sent Events (SSE)
router.get('/:name/logs/stream', (req: Request, res: Response) => {
  const { name } = req.params;
  const service = typeof req.query.service === 'string' ? req.query.service : undefined;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  try {
    const stopStream = instanceService.streamLogs(
      name,
      service,
      (chunk) => {
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      },
      () => {
        res.write(`data: ${JSON.stringify({ closed: true })}\n\n`);
        res.end();
      }
    );

    req.on('close', () => {
      stopStream();
    });
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

export default router;
