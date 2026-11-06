const logger = require('../utils/logger');

// ─────────────────────────────────────────────────────────────────
// Rotas isentas da checagem Anti-CSRF (validação de Origin/Referer).
//
// São endpoints server-to-server: quem chama é OUTRO servidor (ex.: o
// Mercado Pago), não o navegador do usuário. Esses requests NÃO enviam
// header Origin/Referer, então a checagem de CSRF sempre falharia e
// bloquearia a notificação legítima.
//
// Segurança: essas rotas têm o próprio mecanismo de autenticação. O
// webhook do Mercado Pago, por exemplo, valida a assinatura HMAC-SHA256
// (x-signature) com o segredo MERCADO_PAGO_WEBHOOK_SECRET dentro do
// próprio controller — o que é mais forte do que a checagem de origem.
// ─────────────────────────────────────────────────────────────────
const ROTAS_ISENTAS = [
    '/api/webhook',
];

const isRotaIsenta = (caminho) =>
    ROTAS_ISENTAS.some((prefixo) => caminho.startsWith(prefixo));

const csrfMiddleware = (req, res, next) => {
    // Endpoints server-to-server passam direto (protegidos por assinatura própria).
    if (isRotaIsenta(req.path)) {
        return next();
    }

    // Apenas validamos métodos que alteram o estado do servidor (ignora GET, OPTIONS, etc.)
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        const origin = req.headers.origin;
        const referer = req.headers.referer;
        const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:3000';

        // O browser envia sempre o Origin ou Referer em requests cross-origin que usam POST/PUT/DELETE
        const requestSource = origin || referer;

        if (!requestSource || !requestSource.startsWith(allowedOrigin)) {
            logger.warn(`Tentativa de CSRF bloqueada. Origem detetada: ${requestSource || 'Desconhecida'} | IP: ${req.ip} | Rota: ${req.method} ${req.path}`);
            return res.status(403).json({
                message: 'Acesso negado. Falha na validação de origem da requisição (Segurança Anti-CSRF).'
            });
        }
    }
    next();
};

module.exports = csrfMiddleware;