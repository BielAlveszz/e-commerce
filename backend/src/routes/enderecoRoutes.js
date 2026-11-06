const express = require('express');
const router = express.Router();
const enderecoController = require('../controllers/enderecoController');
const authMiddleware = require('../middleware/authMiddleware');

// Todas as rotas de endereço exigem que o cliente esteja logado
router.use(authMiddleware);

router.get('/', enderecoController.getMeusEnderecos);
router.post('/', enderecoController.adicionarEndereco);
router.patch('/:id/principal', enderecoController.definirPrincipal);
router.delete('/:id', enderecoController.deletarEndereco);

module.exports = router;