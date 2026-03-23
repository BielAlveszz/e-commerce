const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const adminMiddleware = require('../middleware/adminMiddleware');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/images/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // máximo 5MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedMimes.includes(file.mimetype)) {
      return cb(new Error('Tipo de arquivo não permitido. Use JPEG, PNG, WebP ou GIF.'));
    }
    cb(null, true);
  }
});

// Rota protegida — apenas admins podem fazer upload
router.post('/', adminMiddleware, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Nenhum arquivo enviado.' });
  }
  res.status(201).json({
    message: 'Imagem enviada com sucesso!',
    imageUrl: `/images/${req.file.filename}`,
    imageFilename: req.file.filename
  });
});

module.exports = router;