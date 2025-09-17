const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// Esta rota receberá as notificações do Mercado Pago
router.post('/mercadopago', webhookController.receiveNotification);

module.exports = router;