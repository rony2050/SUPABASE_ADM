"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const instance_service_1 = require("../services/instance.service");
const router = (0, express_1.Router)();
// Listar todas as instâncias
router.get('/', async (_req, res) => {
    try {
        const instances = await instance_service_1.instanceService.listInstances();
        res.json({ success: true, data: instances });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// Sugerir próximo bloco de portas livre
router.get('/next-port', async (_req, res) => {
    try {
        const port = await instance_service_1.instanceService.getNextAvailablePort();
        res.json({ success: true, portBase: port });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// Obter credenciais e chaves de uma instância
router.get('/:name/credentials', (req, res) => {
    try {
        const creds = instance_service_1.instanceService.getCredentials(req.params.name);
        res.json({ success: true, data: creds });
    }
    catch (err) {
        res.status(404).json({ success: false, error: err.message });
    }
});
// Criar nova instância
router.post('/', async (req, res) => {
    try {
        const { name, portBase, dbPassword, startAfter } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, error: 'O nome da instância é obrigatório.' });
        }
        const result = await instance_service_1.instanceService.createInstance({
            name,
            portBase: portBase ? parseInt(portBase, 10) : undefined,
            dbPassword,
            startAfter,
        });
        res.status(201).json({ success: true, data: result });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// Executar ação de controle (start, stop, restart, destroy)
router.post('/:name/:action', async (req, res) => {
    const { name, action } = req.params;
    try {
        let result = '';
        switch (action) {
            case 'start':
                result = await instance_service_1.instanceService.startInstance(name);
                break;
            case 'stop':
                result = await instance_service_1.instanceService.stopInstance(name);
                break;
            case 'restart':
                result = await instance_service_1.instanceService.restartInstance(name);
                break;
            case 'destroy':
                const keepVolumes = req.body?.keepVolumes === true;
                result = await instance_service_1.instanceService.destroyInstance(name, keepVolumes);
                break;
            default:
                return res.status(400).json({ success: false, error: `Ação inválida: ${action}` });
        }
        res.json({ success: true, message: result });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// Fazer backup do banco de dados (pg_dump)
router.post('/:name/backup', async (req, res) => {
    try {
        const result = await instance_service_1.instanceService.backupDatabase(req.params.name);
        res.json({ success: true, data: result });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// Stream de logs em tempo real via Server-Sent Events (SSE)
router.get('/:name/logs/stream', (req, res) => {
    const { name } = req.params;
    const service = typeof req.query.service === 'string' ? req.query.service : undefined;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
    try {
        const stopStream = instance_service_1.instanceService.streamLogs(name, service, (chunk) => {
            res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
        }, () => {
            res.write(`data: ${JSON.stringify({ closed: true })}\n\n`);
            res.end();
        });
        req.on('close', () => {
            stopStream();
        });
    }
    catch (err) {
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.end();
    }
});
exports.default = router;
