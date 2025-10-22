const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const adminMiddleware = require('../middleware/adminMiddleware');

// A rota será protegida, apenas administradores podem ver as estatísticas
router.get('/stats', adminMiddleware, dashboardController.getDashboardStats);

module.exports = router;