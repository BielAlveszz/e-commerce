const express = require('express');
const router  = express.Router();
const cupomController = require('../controllers/cupomController');
const authMiddleware  = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Rota pública (cliente logado valida o cupom antes de finalizar)
router.post('/validar', authMiddleware, cupomController.validarCupom);

// Rotas de admin
router.get('/',        adminMiddleware, cupomController.listarCupons);
router.post('/',       adminMiddleware, cupomController.criarCupom);
router.patch('/:id/toggle', adminMiddleware, cupomController.toggleCupom);
router.delete('/:id',  adminMiddleware, cupomController.deletarCupom);

module.exports = router;