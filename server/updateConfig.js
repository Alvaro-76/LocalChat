const os = require('os');
const fs = require('fs');
const path = require('path');

let ip = '127.0.0.1';

const nets = os.networkInterfaces();
for (const name of Object.keys(nets)) {
  for (const net of nets[name]) {
    if (net.family === 'IPv4' && !net.internal) {
      ip = net.address;
      break;
    }
  }
  if (ip !== '127.0.0.1') break;
}

fs.writeFileSync(path.join(__dirname, 'config.json'), JSON.stringify({ localIP: ip }, null, 2));

const PORT = 3000;
console.log(`IP local: ${ip}`);
console.log(`Chat:     http://${ip}:${PORT}/app`);
console.log('');
console.log('Configuracion actualizada.');
