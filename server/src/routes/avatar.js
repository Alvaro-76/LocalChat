const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const AVATAR_DIR = path.join(__dirname, '..', '..', 'avatars');
if (!fs.existsSync(AVATAR_DIR)) fs.mkdirSync(AVATAR_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, AVATAR_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safe = crypto.randomBytes(8).toString('hex');
    cb(null, `${safe}-${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) return cb(null, true);
    cb(new Error('Solo imágenes: jpg, png, gif, webp'));
  }
});

const router = express.Router();

/**
 * @openapi
 * /api/avatar/upload:
 *   post:
 *     tags: [Avatares]
 *     summary: Subir avatar
 *     description: Sube una imagen de avatar para el usuario autenticado. Máx 5 MB.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: Archivo de imagen (jpg, png, gif, webp)
 *     responses:
 *       200:
 *         description: Avatar subido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AvatarUploadResponse'
 *       400:
 *         description: No se envió ningún archivo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Token requerido o inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/upload', authMiddleware, upload.single('avatar'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se envió ningún archivo' });

  const filename = req.file.filename;
  const user = db.getUser(req.user.username);
  if (user) {
    db.updateUserAvatar(req.user.username, { type: 'image', path: filename });
  }

  res.json({ success: true, avatar: { type: 'image', path: filename } });
});

/**
 * @openapi
 * /api/avatar/{username}:
 *   get:
 *     tags: [Avatares]
 *     summary: Obtener avatar de un usuario
 *     description: Devuelve la imagen del avatar de un usuario.
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *         description: Nombre de usuario
 *     responses:
 *       200:
 *         description: Imagen del avatar
 *         content:
 *           image/*:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: No avatar
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:username', (req, res) => {
  const { username } = req.params;
  const user = db.getUser(username);

  if (user && user.avatar && user.avatar.type === 'image') {
    const filePath = path.join(AVATAR_DIR, user.avatar.path);
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    }
  }

  res.status(404).json({ error: 'No avatar' });
});

module.exports = router;
