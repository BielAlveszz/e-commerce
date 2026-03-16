const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');
const rateLimit = require('express-rate-limit');

// Opcional, mas recomendado: Rate Limiting específico para webhooks.
// O MP faz muitas requisições, então o limite pode ser maior, mas evita ataques DoS.
const webhookLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 300, // Limite de 300 notificações a cada 5 minutos
  message: 'Muitas requisições de webhook.',
});

/**
 * POST /api/webhook/mercadopago
 * Rota que deve ser cadastrada lá no painel de desenvolvedores do Mercado Pago
 */
router.post('/mercadopago', webhookLimiter, webhookController.receberNotificacao);

module.exports = router;