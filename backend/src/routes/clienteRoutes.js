const express = require('express');
const router  = express.Router();
const clienteController = require('../controllers/clienteController');
const senhaController   = require('../controllers/senhaController');
const authMiddleware    = require('../middleware/authMiddleware');

router.post('/registrar', clienteController.registrarCliente);
router.post('/login',     clienteController.loginCliente);
router.post('/logout',    clienteController.logoutCliente);
router.get('/me',         authMiddleware, clienteController.getMe);
router.put('/me',         authMiddleware, clienteController.atualizarPerfil);
router.put('/me/senha',   authMiddleware, clienteController.trocarSenha);
router.post('/solicitar-reset', senhaController.solicitarReset);
router.post('/resetar-senha',   senhaController.resetarSenha);

module.exports = router;