const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const authMiddleware = require('../middleware/authMiddleware');
// Importando o filtro de segurança
const { sanitizeInput } = require('../middleware/validationMiddleware');

// Rota pública para buscar avaliações
router.get('/produto/:produtoId', reviewController.getReviewsByProduct);

// Rota protegida para criar uma nova avaliação
// O sanitizeInput entra antes do controller para "limpar" a avaliação do cliente
router.post('/', authMiddleware, sanitizeInput, reviewController.createReview);

module.exports = router;