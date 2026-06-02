require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./auth/auth');
const downloadRoutes = require('./routes/download');
const fileRoutes = require('./routes/files');
const avatarRoutes = require('./routes/avatar');
const setupSocket = require('./sockets/chat');
const { setupRooms } = require('./sockets/rooms');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
const logger = require('./lib/logger');
const pinoHttp = require('pino-http');

const os = require('os');
const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;

let LOCAL_IP = '127.0.0.1';
try {
  const configPath = path.join(__dirname, '..', 'config.json');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (config.localIP) LOCAL_IP = config.localIP;
  }
} catch (err) {
  logger.warn(err, 'Error al leer config.json');
}

const allowedOrigins = [undefined, 'http://localhost:3000', `http://localhost:${PORT}`, 'http://127.0.0.1:3000', `http://127.0.0.1:${PORT}`];
if (LOCAL_IP !== '127.0.0.1') {
  allowedOrigins.push(`http://${LOCAL_IP}:${PORT}`);
}

const interfaces = os.networkInterfaces();
for (const name of Object.keys(interfaces)) {
  for (const iface of interfaces[name]) {
    if (iface.family === 'IPv4' && iface.address !== '127.0.0.1') {
      allowedOrigins.push(`http://${iface.address}:${PORT}`);
    }
  }
}

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true
};

const io = new Server(server, {
  cors: corsOptions
});

app.use(cors(corsOptions));
app.use(pinoHttp({ logger }));
app.use(express.json({ limit: '1mb' }));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

const authLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: { error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' } });
const uploadLimiter = rateLimit({ windowMs: 60 * 1000, max: 5, message: { error: 'Demasiadas subidas. Intenta de nuevo en un minuto.' } });

app.use('/auth', authLimiter, authRoutes);
app.use('/api/files/upload', uploadLimiter);
app.use('/api/avatar/upload', uploadLimiter);

app.use('/api/webdownload', downloadRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/avatar', avatarRoutes);

const clientBuildPath = path.join(__dirname, '..', '..', 'client', 'dist');
app.use('/app', express.static(clientBuildPath));

app.get('/app/*', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>LocalChat</title></head>
<body style="font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#1a1a2e;color:#eee">
  <div style="text-align:center">
    <h1>LocalChat</h1>
    <p>Accede al chat desde cualquier dispositivo en tu red:</p>
    <p style="font-size:1.5em;background:#16213e;padding:12px 24px;border-radius:8px">
      <a href="http://${LOCAL_IP}:${PORT}/app" style="color:#0f0">http://${LOCAL_IP}:${PORT}/app</a>
    </p>
  </div>
</body>
</html>`);
});

setupSocket(io);
setupRooms(io);

server.listen(PORT, '0.0.0.0', () => {
  logger.info(`========================================`);
  logger.info(`Servidor:     http://${LOCAL_IP}:${PORT}`);
  logger.info(`  App:          http://${LOCAL_IP}:${PORT}/app`);
  logger.info(`  Chat:         ws://${LOCAL_IP}:${PORT} (Socket.IO)`);
  logger.info(`  Documentación: http://${LOCAL_IP}:${PORT}/api-docs`);
  logger.info(`========================================`);

  try {
    const mdns = require('multicast-dns')();
    mdns.on('query', (query) => {
      if (query.questions?.some(q => q.name === 'localchat.local' && q.type === 'A')) {
        mdns.respond({
          answers: [{
            name: 'localchat.local',
            type: 'A',
            ttl: 300,
            data: LOCAL_IP
          }]
        });
      }
    });
    logger.info(`mDNS: localchat.local → ${LOCAL_IP}`);
  } catch (e) {
    logger.warn('mDNS no disponible en este sistema');
  }
});
