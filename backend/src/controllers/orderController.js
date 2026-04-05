const OrderModel    = require('../models/orderModel');
const CarrinhoModel = require('../models/carrinhoModel');
const CupomModel    = require('../models/cupomModel');
const db            = require('../database');
const { MercadoPagoConfig, Payment } = require('mercadopago');

const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN,
});

// ─────────────────────────────────────────────────────────────────
// POST /api/pedidos
// Cria pedido, gera PIX e vincula cupom ao registro do pedido
// ─────────────────────────────────────────────────────────────────
const createOrder = async (req, res) => {
    const { cartItems, codigoCupom } = req.body;
    const clienteId = req.user.id;

    if (!cartItems || cartItems.length === 0) {
        return res.status(400).json({ message: 'O carrinho está vazio!' });
    }

    try {
        // Busca dados completos do cliente (JWT só carrega id e is_admin)
        const { rows } = await db.query(
            'SELECT id, nome, email, cpf FROM clientes WHERE id = $1',
            [clienteId]
        );
        const cliente = rows[0];

        if (!cliente) {
            return res.status(404).json({ message: 'Cliente não encontrado.' });
        }
        if (!cliente.cpf) {
            return res.status(400).json({
                message: 'Cadastro incompleto. Adicione seu CPF em "Minha Conta" para finalizar a compra.',
            });
        }

        // Proteção contra duplo clique / aba duplicada:
        // bloqueia se já existe um pedido pendente criado nos últimos 2 minutos
        const { rows: pedidoRecente } = await db.query(
            `SELECT id FROM pedidos
             WHERE cliente_id = $1
               AND status = 'pagamento_pendente'
               AND criado_em > NOW() - INTERVAL '2 minutes'
             LIMIT 1`,
            [clienteId]
        );

        if (pedidoRecente.length > 0) {
            return res.status(409).json({
                message: 'Você já tem um pedido pendente criado agora mesmo. ' +
                         'Verifique seus pedidos em "Minha Conta" ou aguarde alguns minutos.',
            });
        }

        // Valida e calcula o desconto do cupom (se informado)
        let cupomAplicado = null;
        if (codigoCupom && codigoCupom.trim()) {
            // Calcula subtotal usando preço efetivo (promo ou normal) para validar o mínimo do cupom
            const subtotalTemp = cartItems.reduce((soma, item) => {
                const preco = item.preco_promocional && parseFloat(item.preco_promocional) > 0
                    ? parseFloat(item.preco_promocional)
                    : parseFloat(item.preco);
                return soma + preco * item.quantity;
            }, 0);

            cupomAplicado = await CupomModel.validar(codigoCupom.trim(), subtotalTemp);
        }

        // Cria o pedido no banco (transação atômica com validação de estoque)
        // O model já registra cupom_id e desconto_aplicado na tabela de pedidos
        const novoPedido = await OrderModel.create(clienteId, cartItems, cupomAplicado);

        // Gera o pagamento PIX via Mercado Pago
        const payment = new Payment(client);
        const pixBody = {
            transaction_amount: Number(novoPedido.valor_total),
            description:        `Pedido #${novoPedido.id} - Meby Cosméticos`,
            payment_method_id:  'pix',
            payer: {
                email:          cliente.email,
                first_name:     cliente.nome,
                identification: {
                    type:   'CPF',
                    number: cliente.cpf.replace(/\D/g, ''),
                },
            },
        };

        const pixData = await payment.create({ body: pixBody });
        const { qr_code_base64, qr_code } = pixData.point_of_interaction.transaction_data;

        // Salva as informações do PIX no pedido
        await OrderModel.addPixInfo(novoPedido.id, qr_code, pixData.id, qr_code_base64);

        // Registra o uso do cupom apenas após tudo ter dado certo
        if (cupomAplicado) {
            await CupomModel.registrarUso(cupomAplicado.id);
        }

        // Limpa o carrinho do banco após criar o pedido com sucesso
        await CarrinhoModel.clearCart(clienteId);

        res.status(201).json({
            message: 'Pedido criado com sucesso!',
            pedido: {
                ...novoPedido,
                qr_code_base64,
                qr_code_copia_cola: qr_code,
            },
            desconto: cupomAplicado?.desconto || 0,
        });

    } catch (err) {
        console.error('ERRO AO PROCESSAR PEDIDO:', err.cause || err.message || err);
        res.status(400).json({
            message: err.message || 'Ocorreu um erro ao processar o pedido.',
        });
    }
};

// ─────────────────────────────────────────────────────────────────
// GET /api/pedidos/meus-pedidos
// MELHORIA: agora suporta paginação via query params page e limit
// ─────────────────────────────────────────────────────────────────
const getMyOrders = async (req, res) => {
    try {
        const search = req.query.search || '';
        const page   = parseInt(req.query.page)  || 1;
        const limit  = parseInt(req.query.limit) || 10;

        const result = await OrderModel.findByClient(req.user.id, search, page, limit);
        res.json(result);
    } catch (error) {
        console.error('Erro ao buscar pedidos:', error);
        res.status(500).json({ message: 'Erro no servidor.' });
    }
};

// ─────────────────────────────────────────────────────────────────
// GET /api/pedidos (admin)
// ─────────────────────────────────────────────────────────────────
const getAllOrders = async (req, res) => {
    try {
        const page   = parseInt(req.query.page)  || 1;
        const limit  = parseInt(req.query.limit) || 20;
        const search = req.query.search || '';
        const orders = await OrderModel.findAll(page, limit, search);
        res.json(orders);
    } catch (error) {
        console.error('Erro ao buscar pedidos:', error);
        res.status(500).json({ message: 'Erro no servidor.' });
    }
};

// ─────────────────────────────────────────────────────────────────
// GET /api/pedidos/detalhes/:id
// ─────────────────────────────────────────────────────────────────
const getOrderDetails = async (req, res) => {
    try {
        const details = await OrderModel.findByIdAndClientId(req.params.id, req.user.id);
        if (!details) {
            return res.status(404).json({
                message: 'Pedido não encontrado ou não pertence a este usuário.',
            });
        }
        res.json(details);
    } catch (error) {
        console.error('Erro ao buscar detalhes do pedido:', error);
        res.status(500).json({ message: 'Erro no servidor.' });
    }
};

// ─────────────────────────────────────────────────────────────────
// PATCH /api/pedidos/:id/status (admin)
// Máquina de estados: valida transições permitidas antes de mudar
// ─────────────────────────────────────────────────────────────────
const TRANSICOES_VALIDAS = {
    pagamento_pendente: ['cancelado'],
    pago:               ['em_separacao', 'cancelado'],
    em_separacao:       ['enviado', 'cancelado'],
    enviado:            ['entregue'],
    // Estados finais não têm transições
};

const updateOrderStatus = async (req, res) => {
    const { id }     = req.params;
    const { status } = req.body;

    const statusValidos = ['pago', 'em_separacao', 'enviado', 'entregue', 'cancelado'];
    if (!statusValidos.includes(status)) {
        return res.status(400).json({ message: `Status inválido: "${status}".` });
    }

    try {
        const { rows } = await db.query(
            'SELECT status FROM pedidos WHERE id = $1',
            [id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Pedido não encontrado.' });
        }

        const statusAtual = rows[0].status;
        const transicoesPermitidas = TRANSICOES_VALIDAS[statusAtual] || [];

        if (!transicoesPermitidas.includes(status)) {
            return res.status(400).json({
                message: `Não é possível mover de "${statusAtual}" para "${status}".`,
            });
        }

        const pedido = await OrderModel.updateStatusById(id, status);
        res.json({ message: 'Status atualizado com sucesso.', pedido });

    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        res.status(500).json({ message: 'Erro no servidor.' });
    }
};

module.exports = {
    createOrder,
    getMyOrders,
    getAllOrders,
    getOrderDetails,
    updateOrderStatus,
};