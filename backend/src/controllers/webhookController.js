const crypto = require('crypto');
const OrderModel = require('../models/orderModel');

// A chave secreta fornecida pelo Mercado Pago nas configurações de Webhook
// IMPORTANTE: Adicione MERCADOPAGO_WEBHOOK_SECRET no seu arquivo .env
const MP_WEBHOOK_SECRET = process.env.MERCADO_PAGO_ACCESS_TOKEN;

const receberNotificacao = async (req, res) => {
    try {
        // 1. Extração dos cabeçalhos de segurança que o Mercado Pago envia
        const xSignature = req.headers['x-signature'];
        const xRequestId = req.headers['x-request-id'];

        // Se a requisição não tem os cabeçalhos, não veio do Mercado Pago
        if (!xSignature || !xRequestId) {
            return res.status(403).json({ message: 'Acesso negado. Cabeçalhos de segurança ausentes.' });
        }

        // 2. Extração do ID do pagamento do corpo da requisição
        // O MP geralmente envia no formato: { data: { id: "12345" }, type: "payment" }
        const dataId = req.body.data?.id;
        if (!dataId) {
            return res.status(400).json({ message: 'Formato de payload inválido. ID ausente.' });
        }

        // 3. Separar o Timestamp (ts) e o Hash (v1) de dentro do x-signature
        // Exemplo de como vem: "ts=1700000000,v1=abcdef123456..."
        const parts = xSignature.split(',');
        let ts, hashOriginal;
        
        parts.forEach(part => {
            const [key, value] = part.split('=');
            if (key === 'ts') ts = value;
            if (key === 'v1') hashOriginal = value;
        });

        if (!ts || !hashOriginal) {
            return res.status(403).json({ message: 'Acesso negado. Assinatura malformada.' });
        }

        // 4. Criação do "Manifesto"
        // O Mercado Pago exige que juntemos essas 3 informações nesta ordem exata
        const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

        // 5. Geração do nosso Hash para comparar
        // Usamos HMAC SHA256 combinando o manifesto com a nossa Chave Secreta
        const hashGerado = crypto
            .createHmac('sha256', MP_WEBHOOK_SECRET)
            .update(manifest)
            .digest('hex');

        // 6. A Prova de Fogo: Comparar os Hashes
        if (hashGerado !== hashOriginal) {
            console.error(`🚨 ALERTA DE SEGURANÇA: Tentativa de fraude no Webhook! IP: ${req.ip}`);
            return res.status(403).json({ message: 'Assinatura inválida. Requisição rejeitada.' });
        }

        // ==========================================================
        // SE CHEGOU AQUI, A REQUISIÇÃO É 100% AUTÊNTICA E SEGURA!
        // ==========================================================
        
        const { type } = req.body;

        // Verifica se é uma notificação de pagamento (o MP também manda notificações de disputas, etc)
        if (type === 'payment') {
            console.log(`✅ Pagamento ${dataId} autêntico recebido. Atualizando banco de dados...`);
            
            // Aqui você chamaria a sua função de banco de dados para atualizar o pedido
            // Exemplo: await OrderModel.atualizarStatus(dataId, 'pago');
        }

        // 7. Responder rápido!
        // O Mercado Pago exige que sua API responda com status 200 (OK) o mais rápido possível.
        // Se demorar muito ou der erro, ele fica reenviando a notificação.
        res.status(200).send('OK');

    } catch (error) {
        console.error('Erro interno no webhook:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

module.exports = {
    receberNotificacao
};