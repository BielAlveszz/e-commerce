const { MercadoPagoConfig, MerchantOrder } = require('mercadopago');
const OrderModel = require('../models/orderModel');

const client = new MercadoPagoConfig({ 
    accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN 
});

const receiveNotification = async (req, res) => {
    const { query } = req;
    const topic = query.topic || query.type;

    console.log('Notificação recebida:', { topic, id: query.id });

    try {
        if (topic === 'merchant_order') {
            const merchantOrder = await new MerchantOrder(client).get({ merchantOrderId: query.id });
            
            // A ordem de pagamento pode ter vários pagamentos, pegamos o último
            const paymentInfo = merchantOrder.payments?.[merchantOrder.payments.length - 1];

            if (paymentInfo && paymentInfo.status === 'approved') {
                const mercadoPagoId = paymentInfo.id;
                console.log(`Pagamento ${mercadoPagoId} aprovado. Atualizando pedido no banco...`);
                
                // Usamos o ID do pagamento para encontrar e atualizar nosso pedido
                await OrderModel.updateStatusByMpId(mercadoPagoId, 'pago');
                
                console.log('Pedido atualizado com sucesso!');
            }
        }
        res.status(200).send();
    } catch (error) {
        console.error('Erro ao processar notificação do Mercado Pago:', error);
        res.status(500).send('Erro no servidor');
    }
};

module.exports = {
    receiveNotification,
};