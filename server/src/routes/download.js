const express = require('express');
const path = require('path');

const router = express.Router();

/**
 * @openapi
 * /api/webdownload:
 *   get:
 *     tags: [Otros]
 *     summary: Redirigir a la app
 *     description: Redirige al cliente web en /app.
 *     responses:
 *       302:
 *         description: Redirección a /app
 */
router.get('/', (req, res) => {
  res.redirect('/app');
});

module.exports = router;
