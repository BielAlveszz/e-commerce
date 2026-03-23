const crypto = require('crypto');
const OrderModel = require('../models/orderModel');
const { MercadoPagoConfig, Payment } = require('mercadopago');

// Chave secreta gerada no painel de Webhooks do Mercado Pago (diferente do access token!)
const MP_WEBHOOK_SECRET = process.env.MERCADO_PAGO_WEBHOOK_SECRET;

const mpClient = new MercadoPagoConfig({
    accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN
});

const receberNotificacao = async (req, res) => {
    try {
        const xSignature = req.headers['x-signature'];
        const xRequestId = req.headers['x-request-id'];

        if (!xSignature || !xRequestId) {
            return res.status(403).json({ message: 'Acesso negado. Cabeçalhos de segurança ausentes.' });
        }

        const dataId = req.body.data?.id;
        if (!dataId) {
            return res.status(400).json({ message: 'Formato de payload inválido. ID ausente.' });
        }

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

        const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

        const hashGerado = crypto
            .createHmac('sha256', MP_WEBHOOK_SECRET)
            .update(manifest)
            .digest('hex');

        if (hashGerado !== hashOriginal) {
            console.error(`🚨 ALERTA DE SEGURANÇA: Tentativa de fraude no Webhook! IP: ${req.ip}`);
            return res.status(403).json({ message: 'Assinatura inválida. Requisição rejeitada.' });
        }

        // Requisição autenticada — processar o evento
        const { type } = req.body;

        if (type === 'payment') {
            // Consulta o status real do pagamento diretamente na API do Mercado Pago
            const payment = new Payment(mpClient);
            const paymentInfo = await payment.get({ id: dataId });

            const statusMap = {
                approved: 'pago',
                rejected: 'recusado',
                cancelled: 'cancelado',
                in_process: 'em_analise',
                pending: 'pagamento_pendente',
            };

            const novoStatus = statusMap[paymentInfo.status];

            if (novoStatus) {
                await OrderModel.updateStatusByMpId(dataId, novoStatus);
                console.log(`✅ Pedido com MP ID ${dataId} atualizado para: ${novoStatus}`);
            }
        }

        // Responder rápido para o Mercado Pago não reenviar a notificação
        res.status(200).send('OK');

    } catch (error) {
        console.error('Erro interno no webhook:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

module.exports = {
    receberNotificacao
};