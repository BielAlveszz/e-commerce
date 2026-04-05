const express = require('express');
const router = express.Router();
const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getOnSaleProducts,
  getBestsellerProducts,
  getRelatedProducts,
  updateEstoque,
} = require('../controllers/productController');

const { validateProduct, sanitizeInput } = require('../middleware/validationMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Muitas requisições deste IP, tente novamente mais tarde',
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/', limiter, sanitizeInput, getAllProducts);
router.get('/ofertas', limiter, getOnSaleProducts);
router.get('/destaques', limiter, getBestsellerProducts);
router.get('/:id/relacionados', limiter, getRelatedProducts);
router.get('/:id', limiter, sanitizeInput, getProductById);

router.post(
  '/',
  limiter,
  adminMiddleware,
  sanitizeInput,
  createProduct
);

router.put(
  '/:id',
  limiter,
  adminMiddleware,
  sanitizeInput,
  updateProduct
);

router.patch(
  '/:id/estoque',
  limiter,
  adminMiddleware,
  updateEstoque
);

router.delete(
  '/:id',
  limiter,
  adminMiddleware,
  sanitizeInput,
  deleteProduct
);

module.exports = router;