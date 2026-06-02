const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { authMiddleware } = require('../middleware/auth');
const logger = require('../lib/logger');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIMES = ['image/jpeg','image/png','image/gif','image/webp','image/svg+xml','image/bmp','image/tiff','application/pdf','application/zip','application/x-zip-compressed','application/x-rar-compressed','application/x-7z-compressed','application/x-tar','application/gzip','text/plain','text/csv','text/html','text/css','text/javascript','application/json','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation','audio/mpeg','audio/wav','audio/ogg','audio/mp4','audio/flac','video/mp4','video/webm','video/ogg','video/quicktime','application/octet-stream'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const id = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, `${id}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Tipo de archivo no permitido'));
  }
});

function sanitizeParam(val) {
  if (typeof val !== 'string') return '';
  return val.replace(/\.\./g, '').replace(/[/\\]/g, '');
}

const router = express.Router();

/**
 * @openapi
 * /api/files/upload:
 *   post:
 *     tags: [Archivos]
 *     summary: Subir archivo
 *     description: Sube un archivo adjunto. Máx 50 MB. Tipos permitidos: imágenes, documentos, audio, video.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Archivo a subir
 *     responses:
 *       200:
 *         description: Archivo subido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FileUploadResponse'
 *       400:
 *         description: No se envió ningún archivo o tipo no permitido
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
router.post('/upload', authMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se envio ningun archivo' });

  const fileId = path.basename(req.file.filename, path.extname(req.file.filename));
  const fileData = {
    fileId,
    fileName: req.file.originalname.replace(/[<>"']/g, ''),
    fileSize: req.file.size,
    mimeType: req.file.mimetype
  };

  logger.info({ username: req.user?.username, fileName: fileData.fileName, fileSize: fileData.fileSize }, 'Archivo subido');
  res.json(fileData);
});

/**
 * @openapi
 * /api/files/{id}/{filename}:
 *   get:
 *     tags: [Archivos]
 *     summary: Descargar/ver archivo
 *     description: Obtiene un archivo subido para visualizarlo (inline).
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del archivo (sin extensión)
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: Nombre del archivo con extensión
 *     responses:
 *       200:
 *         description: Contenido del archivo
 *       400:
 *         description: Parámetros inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Archivo no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id/:filename', (req, res) => {
  const id = sanitizeParam(req.params.id);
  const filename = sanitizeParam(req.params.filename);
  if (!id || !filename) return res.status(400).json({ error: 'Parametros invalidos' });
  const filePath = path.join(UPLOAD_DIR, `${id}${path.extname(filename)}`);
  if (!fs.existsSync(filePath)) { logger.warn({ fileId: id }, 'Archivo no encontrado'); return res.status(404).json({ error: 'Archivo no encontrado' }); }
  logger.debug({ fileId: id, filename }, 'Archivo visualizado');
  res.sendFile(filePath);
});

/**
 * @openapi
 * /api/files/{id}/{filename}/download:
 *   get:
 *     tags: [Archivos]
 *     summary: Forzar descarga de archivo
 *     description: Obtiene un archivo como attachment (descarga forzada).
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del archivo
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: Nombre del archivo con extensión
 *     responses:
 *       200:
 *         description: Archivo descargado como attachment
 *       400:
 *         description: Parámetros inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Archivo no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id/:filename/download', (req, res) => {
  const id = sanitizeParam(req.params.id);
  const filename = sanitizeParam(req.params.filename);
  if (!id || !filename) return res.status(400).json({ error: 'Parametros invalidos' });
  const filePath = path.join(UPLOAD_DIR, `${id}${path.extname(filename)}`);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Archivo no encontrado' });
  res.download(filePath, filename);
});

module.exports = router;
