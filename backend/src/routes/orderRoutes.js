const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

router.post('/', authMiddleware, orderController.createOrder);
router.get('/meus-pedidos', authMiddleware, orderController.getMyOrders);
router.get('/', adminMiddleware, orderController.getAllOrders);
router.get('/detalhes/:id', authMiddleware, orderController.getOrderDetails);
router.patch('/:id/status', adminMiddleware, orderController.updateOrderStatus);

module.exports = router;