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

const app = express();
const server = http.createServer(app);

let LOCAL_IP = '127.0.0.1';
try {
  const configPath = path.join(__dirname, '..', 'config.json');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (config.localIP) LOCAL_IP = config.localIP;
  }
} catch {}

const allowedOrigins = [undefined, 'http://localhost:3000', 'http://127.0.0.1:3000'];
if (LOCAL_IP !== '127.0.0.1') {
  allowedOrigins.push(`http://${LOCAL_IP}:3000`);
}

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(null, true);
  },
  credentials: true
};

const io = new Server(server, {
  cors: corsOptions
});

app.use(cors(corsOptions));
app.use(express.json());

const authLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: { error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' } });
const uploadLimiter = rateLimit({ windowMs: 60 * 1000, max: 5, message: { error: 'Demasiadas subidas. Intenta de nuevo en un minuto.' } });

app.use('/auth', authLimiter, authRoutes);
app.use('/api/files/upload', uploadLimiter);
app.use('/api/avatar/upload', uploadLimiter);

app.use('/auth', authRoutes);
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

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n========================================`);
  console.log(`  Servidor: http://${LOCAL_IP}:${PORT}`);
  console.log(`  App:      http://${LOCAL_IP}:${PORT}/app`);
  console.log(`  Chat:     ws://${LOCAL_IP}:${PORT} (Socket.IO)`);
  console.log(`========================================\n`);

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
    console.log(`  📡 mDNS: localchat.local → ${LOCAL_IP}\n`);
  } catch (e) {
    // mDNS no disponible
  }
});
