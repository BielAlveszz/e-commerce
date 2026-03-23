const express = require('express');
const router  = express.Router();
const carrinhoController = require('../controllers/carrinhoController');
const authMiddleware     = require('../middleware/authMiddleware');

// Todas as rotas do carrinho exigem autenticação
router.use(authMiddleware);

router.get('/',                          carrinhoController.getCarrinho);
router.post('/items',                    carrinhoController.addItem);
router.put('/items/:produto_id',         carrinhoController.updateItem);
router.delete('/items/:produto_id',      carrinhoController.removeItem);
router.delete('/',                       carrinhoController.clearCart);
router.post('/merge',                    carrinhoController.mergeCart);

module.exports = router;