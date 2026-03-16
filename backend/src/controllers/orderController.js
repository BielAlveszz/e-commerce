const OrderModel = require('../models/orderModel');
const { MercadoPagoConfig, Payment } = require('mercadopago');

const client = new MercadoPagoConfig({ 
    accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN 
});

const createOrder = async (req, res) => {
    const { cartItems } = req.body;
    const clienteId = req.user.id;

    if (!cartItems || cartItems.length === 0) {
        return res.status(400).json({ message: "O carrinho está vazio!" });
    }
  
    try {
        if (!req.user.cpf) {
            return res.status(400).json({ message: "Cadastro incompleto. Por favor, adicione seu CPF na sua conta para finalizar a compra."});
        }
        
        // Chamamos a função 'create' que fará a transação de bloqueio de estoque
        const novoPedido = await OrderModel.create(clienteId, cartItems);

        const payment = new Payment(client);
        const body = {
            transaction_amount: Number(novoPedido.valor_total),
            description: `Pedido #${novoPedido.id} - Meby Cosméticos`,
            payment_method_id: 'pix',
            payer: {
                email: req.user.email,
                first_name: req.user.nome,
                identification: { type: 'CPF', number: req.user.cpf.replace(/[^\d]/g, "") }
            },
        };

        const pixData = await payment.create({ body });
        const { qr_code_base64, qr_code } = pixData.point_of_interaction.transaction_data;
        
        await OrderModel.addPixInfo(novoPedido.id, qr_code, pixData.id, qr_code_base64);

        res.status(201).json({ 
            message: 'Pedido criado com sucesso!', 
            pedido: { ...novoPedido, qr_code_base64, qr_code_copia_cola: qr_code }
        });
    } catch (err) {
        console.error("ERRO AO PROCESSAR PEDIDO:", err.cause || err.message);
        // Se a mensagem vier do erro da transação (ex: estoque), repassamos amigavelmente
        res.status(400).json({ message: err.message || "Ocorreu um erro ao processar o pedido." });
    }
};

const getMyOrders = async (req, res) => {
    try {
        const orders = await OrderModel.findByClient(req.user.id);
        res.json(orders);
    } catch (error) {
        console.error("Erro ao buscar pedidos do cliente:", error);
        res.status(500).json({ message: 'Erro no servidor.' });
    }
};

const getAllOrders = async (req, res) => {
    try {
        const orders = await OrderModel.findAll();
        res.json(orders);
    } catch (error) {
        console.error("Erro ao buscar todos os pedidos:", error);
        res.status(500).json({ message: 'Erro no servidor.' });
    }
};

const getOrderDetails = async (req, res) => {
    try {
        const orderId = req.params.id;
        const clienteId = req.user.id;

        const details = await OrderModel.findByIdAndClientId(orderId, clienteId);

        if (!details) {
            return res.status(404).json({ message: "Pedido não encontrado ou não pertence a este usuário." });
        }
        
        res.json(details);

    } catch (error) {
        console.error("Erro ao buscar detalhes do pedido:", error);
        res.status(500).json({ message: 'Erro no servidor.' });
    }
};

module.exports = {
    createOrder,
    getMyOrders,
    getAllOrders,
    getOrderDetails,
};