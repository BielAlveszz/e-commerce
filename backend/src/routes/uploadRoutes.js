const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();

// Configuração do Multer para armazenamento
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Onde os arquivos serão salvos
    cb(null, 'public/images/');
  },
  filename: (req, file, cb) => {
    // Define um nome de arquivo único para evitar conflitos
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// ROTA para upload de uma única imagem
// ENDEREÇO: POST http://localhost:3001/api/upload
router.post('/', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Nenhum arquivo enviado.' });
  }
  // Retorna o caminho do arquivo salvo para o frontend
  res.status(201).json({
    message: 'Imagem enviada com sucesso!',
    // A URL pela qual a imagem estará acessível
    imageUrl: `/images/${req.file.filename}`,
    // O nome do arquivo para salvar no banco de dados
    imageFilename: req.file.filename
  });
});

module.exports = router;