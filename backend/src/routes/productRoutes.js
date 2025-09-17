const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const adminMiddleware = require('../middleware/adminMiddleware');

// Rotas Públicas
router.get('/bestsellers', productController.getBestsellerProducts);
router.get('/ofertas', productController.getOnSaleProducts);
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);

// Rotas de Admin
router.post('/', adminMiddleware, productController.createProduct);
router.put('/:id', adminMiddleware, productController.updateProduct);
router.delete('/:id', adminMiddleware, productController.deleteProduct);

module.exports = router;