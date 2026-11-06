const crypto = require('crypto');
const OrderModel = require('../models/orderModel');
const db = require('../database'); // Importando o DB para a checagem de idempotência
const { notificarPagamentoPix } = require('./orderController'); // Importando o gatilho do SSE
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
            // ─────────────────────────────────────────────────────────────────
            // 1. IDEMPOTÊNCIA: Checamos o pedido no banco ANTES de consultar a API
            // ─────────────────────────────────────────────────────────────────
            const { rows } = await db.query(
                'SELECT id, status FROM pedidos WHERE mercado_pago_id = $1', 
                [String(dataId)]
            );
            
            const pedido = rows[0];

            // Se o pedido não existe, retornamos 200 pro MP não ficar tentando reenviar
            if (!pedido) {
                console.log(`⚠️ Pedido não encontrado para o MP ID: ${dataId}`);
                return res.status(200).send('OK');
            }

            // Se o pedido JÁ ESTÁ PAGO (ou em um status mais avançado), cortamos a execução aqui!
            // Isso evita que um webhook duplicado cause retrabalho no banco.
            if (['pago', 'em_separacao', 'enviado', 'entregue'].includes(pedido.status)) {
                console.log(`🔄 Webhook duplicado ignorado. Pedido #${pedido.id} já está: ${pedido.status}`);
                return res.status(200).send('OK');
            }

            // ─────────────────────────────────────────────────────────────────
            // 2. Consulta o status real na API do Mercado Pago
            // ─────────────────────────────────────────────────────────────────
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

            // ─────────────────────────────────────────────────────────────────
            // 3. ATUALIZAÇÃO E DISPARO DO SSE
            // ─────────────────────────────────────────────────────────────────
            if (novoStatus && novoStatus !== pedido.status) {
                await OrderModel.updateStatusByMpId(dataId, novoStatus);
                console.log(`✅ Pedido #${pedido.id} atualizado para: ${novoStatus}`);

                // Se o pagamento acabou de ser aprovado, avisa o Frontend na mesma hora!
                if (novoStatus === 'pago') {
                    notificarPagamentoPix(pedido.id);
                }
            }
        }

        // Responder rápido para o Mercado Pago confirmar o recebimento
        res.status(200).send('OK');

    } catch (error) {
        console.error('Erro interno no webhook:', error);
        // O status 500 faz o Mercado Pago saber que deu erro e ele tentará reenviar mais tarde
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

module.exports = {
    receberNotificacao
};