const express = require('express');
const router = express.Router();
const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');

const {
  validateProduct,
  sanitizeInput,
} = require('../middlewares/validationMiddleware');

const { authMiddleware, adminMiddleware } = require('../middlewares/authMiddleware');
const rateLimit = require('express-rate-limit');

/**
 * Rate Limiting para proteger contra brute force
 */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Máximo de 100 requisições por IP
  message: 'Muitas requisições deste IP, tente novamente mais tarde',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * GET /api/products
 * Obter todos os produtos com paginação e filtros
 * Query params: page, limit, category, search, sort
 */
router.get('/', limiter, sanitizeInput, getAllProducts);

/**
 * GET /api/products/:id
 * Obter um produto específico por ID
 */
router.get('/:id', limiter, sanitizeInput, getProductById);

/**
 * POST /api/products
 * Criar um novo produto (apenas admin)
 * Body: { name, price, category, description?, stock?, image_url? }
 */
router.post(
  '/',
  limiter,
  authMiddleware, // Verificar se está autenticado
  adminMiddleware, // Verificar se é admin
  sanitizeInput, // Sanitizar entrada
  validateProduct, // Validar dados do produto
  createProduct
);

/**
 * PUT /api/products/:id
 * Atualizar um produto (apenas admin)
 * Body: { name?, price?, category?, description?, stock?, image_url? }
 */
router.put(
  '/:id',
  limiter,
  authMiddleware,
  adminMiddleware,
  sanitizeInput,
  validateProduct, // Validação também para PUT
  updateProduct
);

/**
 * DELETE /api/products/:id
 * Deletar um produto (apenas admin)
 */
router.delete(
  '/:id',
  limiter,
  authMiddleware,
  adminMiddleware,
  sanitizeInput,
  deleteProduct
);

module.exports = router;