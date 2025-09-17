const OrderModel = require('../models/orderModel');
const ProductModel = require('../models/productModel'); // Para verificar estoque
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
            throw new Error("Cadastro incompleto. Por favor, adicione seu CPF na sua conta para finalizar a compra.");
        }

        let valorTotal = 0;
        for (const item of cartItems) {
            const produtoNoBanco = await ProductModel.findById(item.id);
            if (!produtoNoBanco || produtoNoBanco.quantidade_estoque < item.quantity) {
                throw new Error(`Produto "${item.nome}" está fora de estoque!`);
            }
            valorTotal += parseFloat(produtoNoBanco.preco) * item.quantity;
        }
        
        const novoPedido = await OrderModel.create(clienteId, valorTotal, cartItems);

        const payment = new Payment(client);
        const body = {
            transaction_amount: Number(valorTotal.toFixed(2)),
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
        
        await OrderModel.addPixInfo(novoPedido.id, qr_code, pixData.id);

        res.status(201).json({ 
            message: 'Pedido criado com sucesso!', 
            pedido: { ...novoPedido, qr_code_base64, qr_code_copia_cola: qr_code }
        });
    } catch (err) {
        console.error("ERRO AO PROCESSAR PEDIDO:", err.cause || err.message);
        res.status(500).json({ message: "Ocorreu um erro ao processar o pedido: " + err.message });
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

module.exports = {
    createOrder,
    getMyOrders,
    getAllOrders,
};