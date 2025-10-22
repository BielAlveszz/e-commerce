const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const authMiddleware = require('../middleware/authMiddleware');

// Rota pública para buscar avaliações
router.get('/produto/:produtoId', reviewController.getReviewsByProduct);

// Rota protegida para criar uma nova avaliação
router.post('/', authMiddleware, reviewController.createReview);

module.exports = router;