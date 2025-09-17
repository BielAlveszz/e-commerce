const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/clienteController');

// Rota de registro agora chama o controller correspondente
router.post('/registrar', clienteController.registrarCliente);

// Rota de login agora chama o controller correspondente
router.post('/login', clienteController.loginCliente);

module.exports = router;