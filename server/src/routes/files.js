const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

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
  limits: { fileSize: 100 * 1024 * 1024 }
});

function sanitizeParam(val) {
  if (typeof val !== 'string') return '';
  return val.replace(/\.\./g, '').replace(/[/\\]/g, '');
}

const router = express.Router();

router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se envio ningun archivo' });

  const fileId = path.basename(req.file.filename, path.extname(req.file.filename));
  const fileData = {
    fileId,
    fileName: req.file.originalname,
    fileSize: req.file.size,
    mimeType: req.file.mimetype
  };

  res.json(fileData);
});

router.get('/:id/:filename', (req, res) => {
  const id = sanitizeParam(req.params.id);
  const filename = sanitizeParam(req.params.filename);
  if (!id || !filename) return res.status(400).json({ error: 'Parametros invalidos' });
  const filePath = path.join(UPLOAD_DIR, `${id}${path.extname(filename)}`);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Archivo no encontrado' });
  res.sendFile(filePath);
});

router.get('/:id/:filename/download', (req, res) => {
  const id = sanitizeParam(req.params.id);
  const filename = sanitizeParam(req.params.filename);
  if (!id || !filename) return res.status(400).json({ error: 'Parametros invalidos' });
  const filePath = path.join(UPLOAD_DIR, `${id}${path.extname(filename)}`);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Archivo no encontrado' });
  res.download(filePath, filename);
});

module.exports = router;
