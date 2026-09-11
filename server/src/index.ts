import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import instancesRouter from './routes/instances.route';
import systemRouter from './routes/system.route';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8585;

app.use(cors());
app.use(express.json());

// Rotas da API
app.use('/api/instances', instancesRouter);
app.use('/api/system', systemRouter);

// Servir frontend compilado
const clientDistPath = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

// Fallback para SPA
app.get('*', (_req, res) => {
  const indexPath = path.join(clientDistPath, 'index.html');
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
