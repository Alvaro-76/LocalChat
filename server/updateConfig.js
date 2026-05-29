const { execSync } = require('child_process');
const fs = require('fs');

let ip = '127.0.0.1';

try {
  const output = execSync('ipconfig', { encoding: 'utf8' });
  const lines = output.split('\n');
  for (const line of lines) {
    const match = line.match(/IPv4.*:\s*([\d.]+)/);
    if (match) {
      const found = match[1];
      if (found !== '127.0.0.1') {
        ip = found;
        break;
      }
    }
  }
} catch {}

fs.writeFileSync('config.json', JSON.stringify({ localIP: ip }, null, 2));

const PORT = 3000;
console.log(`IP local: ${ip}`);
console.log(`Chat:     http://${ip}:${PORT}/app`);
console.log('');
console.log('Configuracion actualizada.');