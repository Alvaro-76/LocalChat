const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db/database');
const { generateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  }
  if (username.length < 3 || username.length > 20) {
    return res.status(400).json({ error: 'Usuario debe tener entre 3 y 20 caracteres' });
  }
  if (!/^[a-zA-Z0-9_\u00C0-\u024F]+$/.test(username)) {
    return res.status(400).json({ error: 'Usuario solo puede contener letras, números y guión bajo' });
  }
  if (password.length < 4) {
    return res.status(400).json({ error: 'Contraseña debe tener al menos 4 caracteres' });
  }
  try {
    const existing = db.getUser(username);
    if (existing) {
      return res.status(409).json({ error: 'El usuario ya existe' });
    }
    const hash = await bcrypt.hash(password, 10);
    const admins = db.getAllUsers().filter((u) => u.role === 'admin');
    const role = admins.length === 0 ? 'admin' : 'user';
    db.createUser(username, hash, role);
    const user = db.getUser(username);
    const token = generateToken(user);
    const avatar = user.avatar || { type: 'color', color: db.stringToColor(user.username) };
    res.status(201).json({ token, user: { id: user.id, username: user.username, role: user.role, avatar } });
  } catch (err) {
    res.status(500).json({ error: 'Error al registrar' });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  }
  try {
    const user = db.getUser(username);
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    const token = generateToken(user);
    const avatar = user.avatar || { type: 'color', color: db.stringToColor(user.username) };
    res.json({ token, user: { id: user.id, username: user.username, role: user.role, avatar } });
  } catch (err) {
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

module.exports = router;
