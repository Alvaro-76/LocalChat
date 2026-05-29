const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const AUTO_SECRET = crypto.randomBytes(32).toString('hex');
const JWT_SECRET = process.env.JWT_SECRET || AUTO_SECRET;

if (!process.env.JWT_SECRET) {
  console.warn(`\n⚠️  JWT_SECRET no configurado. Usando secreto temporal generado.`);
  console.warn(`   Define JWT_SECRET como variable de entorno para persistencia.\n`);
}

function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  try {
    req.user = verifyToken(header.split(' ')[1]);
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

function adminMiddleware(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  next();
}

module.exports = { generateToken, verifyToken, authMiddleware, adminMiddleware, JWT_SECRET };
