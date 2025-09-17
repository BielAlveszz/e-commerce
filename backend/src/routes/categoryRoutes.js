const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const adminMiddleware = require('../middleware/adminMiddleware');

// --- ROTAS PÚBLICAS (para a loja) ---
router.get('/', categoryController.getAllCategories);
router.get('/sub', categoryController.getAllSubCategories);

// --- ROTAS DE ADMIN (protegidas) ---
router.post('/', adminMiddleware, categoryController.createCategory);
router.put('/:id', adminMiddleware, categoryController.updateCategory);
router.delete('/:id', adminMiddleware, categoryController.deleteCategory);

router.post('/sub', adminMiddleware, categoryController.createSubCategory);
router.delete('/sub/:id', adminMiddleware, categoryController.deleteSubCategory);

module.exports = router;