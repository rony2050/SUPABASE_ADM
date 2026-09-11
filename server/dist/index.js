"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const instances_route_1 = __importDefault(require("./routes/instances.route"));
const system_route_1 = __importDefault(require("./routes/system.route"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 8585;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Rotas da API
app.use('/api/instances', instances_route_1.default);
app.use('/api/system', system_route_1.default);
// Servir frontend compilado
const clientDistPath = path_1.default.resolve(__dirname, '../../client/dist');
app.use(express_1.default.static(clientDistPath));
// Fallback para SPA
app.get('*', (_req, res) => {
    const indexPath = path_1.default.join(clientDistPath, 'index.html');
    res.sendFile(indexPath, (err) => {
        if (err) {
            res.status(200).send(`
        <html>
          <head><title>Supabase Local Manager API</title></head>
          <body style="background:#121212;color:#eee;font-family:sans-serif;padding:2rem;">
            <h2>🚀 Supabase Local Manager API está ativa na porta ${PORT}</h2>
            <p>O painel web do cliente está sendo compilado ou não foi encontrado em <code>client/dist</code>.</p>
            <p>Endpoints disponíveis:</p>
            <ul>
              <li><a style="color:#3ecf8e" href="/api/instances">/api/instances</a></li>
              <li><a style="color:#3ecf8e" href="/api/system/info">/api/system/info</a></li>
            </ul>
          </body>
        </html>
      `);
        }
    });
});
app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`⚡ Supabase Manager API & Dashboard ouvindo na porta ${PORT}`);
    console.log(`🌐 Acesse: http://localhost:${PORT}`);
    console.log(`=======================================================`);
});
