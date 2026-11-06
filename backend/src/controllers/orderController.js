const OrderModel = require('../models/orderModel');
const CarrinhoModel = require('../models/carrinhoModel');
const CupomModel = require('../models/cupomModel');
const db = require('../database');
const { MercadoPagoConfig, Payment } = require('mercadopago');
const { decrypt } = require('../utils/crypto');

const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN,
});

// ─────────────────────────────────────────────────────────────────
// SSE (Server-Sent Events) - Gerenciamento de conexões abertas
// ─────────────────────────────────────────────────────────────────
const sseClients = new Map();

const streamPaymentStatus = (req, res) => {
    const { id } = req.params;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.write('data: {"status": "conectado"}\n\n');

    if (!sseClients.has(id)) {
        sseClients.set(id, []);
    }
    sseClients.get(id).push(res);

    req.on('close', () => {
        const clients = sseClients.get(id) || [];
        const activeClients = clients.filter(c => c !== res);
        if (activeClients.length === 0) {
            sseClients.delete(id);
        } else {
            sseClients.set(id, activeClients);
        }
    });
};

const notificarPagamentoPix = (pedidoId) => {
    const clients = sseClients.get(String(pedidoId));
    if (clients) {
        clients.forEach(res => {
            res.write(`data: {"status": "pago", "pedidoId": "${pedidoId}"}\n\n`);
        });
    }
};

// ─────────────────────────────────────────────────────────────────
// POST /api/pedidos
// ─────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────
// POST /api/pedidos
// ─────────────────────────────────────────────────────────────────
const createOrder = async (req, res) => {
    // NOVO: Recebemos o metodoPagamento e o paymentData (Token do Cartão)
    const { cartItems, codigoCupom, metodoPagamento = 'pix', paymentData, enderecoId } = req.body;
    const clienteId = req.user.id;

    if (!cartItems || cartItems.length === 0) {
        return res.status(400).json({ message: 'O carrinho está vazio!' });
    }

    try {
        const { rows } = await db.query(
            'SELECT id, nome, email, cpf FROM clientes WHERE id = $1',
            [clienteId]
        );
        const cliente = rows[0];

        if (cliente && cliente.cpf) {
            cliente.cpf = decrypt(cliente.cpf);
        }

        if (!cliente) {
            return res.status(404).json({ message: 'Cliente não encontrado.' });
        }

        // ── Endereço de entrega: valida que pertence ao cliente e captura o snapshot ──
        // Retrocompatível: se enderecoId não vier, o pedido segue sem endereço (fluxo antigo).
        let enderecoEntrega = null;
        if (enderecoId) {
            const { rows: endRows } = await db.query(
                'SELECT id, apelido, tipo_entrega, descricao_local FROM enderecos WHERE id = $1 AND cliente_id = $2',
                [enderecoId, clienteId]
            );
            if (endRows.length === 0) {
                return res.status(400).json({ message: 'Endereço de entrega inválido ou não pertence a você.' });
            }
            const e = endRows[0];
            enderecoEntrega = {
                id: e.id,
                snapshot: {
                    apelido: e.apelido,
                    tipo_entrega: e.tipo_entrega,
                    descricao_local: e.descricao_local,
                    capturado_em: new Date().toISOString(),
                },
            };
        }

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
                message: 'Você já tem um pedido pendente criado agora mesmo. Verifique seus pedidos em "Minha Conta" ou aguarde.',
            });
        }

        let cupomAplicado = null;
        if (codigoCupom && codigoCupom.trim()) {
            const subtotalTemp = cartItems.reduce((soma, item) => {
                const preco = item.preco_promocional && parseFloat(item.preco_promocional) > 0
                    ? parseFloat(item.preco_promocional)
                    : parseFloat(item.preco);
                return soma + preco * item.quantity;
            }, 0);

            cupomAplicado = await CupomModel.validar(codigoCupom.trim(), subtotalTemp);
        }

        // Cria o pedido no banco de dados (status inicial: pagamento_pendente)
        const novoPedido = await OrderModel.create(clienteId, cartItems, cupomAplicado, enderecoEntrega);
        const payment = new Payment(client);

        // ─────────────────────────────────────────────────────────────
        // FLUXO 1: PAGAMENTO VIA PIX
        // ─────────────────────────────────────────────────────────────
        if (metodoPagamento === 'pix') {
            const pixBody = {
                transaction_amount: Number(novoPedido.valor_total),
                description: `Pedido #${novoPedido.id} - Meby Cosméticos`,
                payment_method_id: 'pix',
                payer: {
                    email: cliente.email,
                    first_name: cliente.nome,
                    identification: {
                        type: 'CPF',
                        number: cliente.cpf.replace(/\D/g, ''),
                    },
                },
            };

            const pixData = await payment.create({ body: pixBody });
            const { qr_code_base64, qr_code } = pixData.point_of_interaction.transaction_data;

            await OrderModel.addPixInfo(novoPedido.id, qr_code, pixData.id, qr_code_base64);

            if (cupomAplicado) await CupomModel.registrarUso(cupomAplicado.id);
            await CarrinhoModel.clearCart(clienteId);

            return res.status(201).json({
                message: 'Pedido criado com sucesso!',
                pedido: { ...novoPedido, qr_code_base64, qr_code_copia_cola: qr_code },
                desconto: cupomAplicado?.desconto || 0,
            });
        }
        // ─────────────────────────────────────────────────────────────
        // FLUXO 2: PAGAMENTO VIA CARTÃO DE CRÉDITO/DÉBITO
        // ─────────────────────────────────────────────────────────────
        else if (metodoPagamento === 'cartao' && paymentData) {

            // O frontend já nos envia os dados encriptados do cartão. 
            // Só precisamos injetar o valor total e o e-mail real do cliente por segurança.
            const cardBody = {
                ...paymentData,
                transaction_amount: Number(novoPedido.valor_total),
                description: `Pedido #${novoPedido.id} - Meby Cosméticos`,
                payer: {
                    ...paymentData.payer,
                    email: cliente.email,
                }
            };

            const cardData = await payment.create({ body: cardBody });

            // Se o cartão for aprovado na hora, já atualizamos o banco de dados
            if (cardData.status === 'approved') {
                await OrderModel.updateStatusById(novoPedido.id, 'pago');
            } else if (cardData.status === 'rejected') {
                await OrderModel.updateStatusById(novoPedido.id, 'recusado');
            }

            if (cupomAplicado) await CupomModel.registrarUso(cupomAplicado.id);
            await CarrinhoModel.clearCart(clienteId);

            return res.status(201).json({
                message: 'Pedido processado com sucesso!',
                pedido: novoPedido,
                statusPagamento: cardData.status, // Enviamos o status de volta ao Frontend
                desconto: cupomAplicado?.desconto || 0,
            });
        }

    } catch (err) {
        console.error('ERRO AO PROCESSAR PEDIDO:', err.cause || err.message || err);
        res.status(400).json({
            message: err.message || 'Ocorreu um erro ao processar o pedido.',
        });
    }
};

// ─────────────────────────────────────────────────────────────────
// POST /api/pedidos/manual (ADMIN) - Vendas Omnichannel (WhatsApp/Insta)
// ─────────────────────────────────────────────────────────────────
const createManualOrder = async (req, res) => {
    // clienteId pode ser nulo se for um visitante rápido do Instagram
    const { itens, clienteId, valorTotalPago } = req.body;

    if (!itens || itens.length === 0) {
        return res.status(400).json({ message: 'O pedido manual precisa ter itens.' });
    }

    const dbClient = await db.connect();

    try {
        await dbClient.query('BEGIN');

        let somaProdutos = 0;
        const itensValidados = [];

        // 1. Valida estoques e identifica as variantes/produtos
        for (const item of itens) {
            let estoqueAtual = 0;
            let nomeItem = '';
            let precoUnitario = 0;

            if (item.produto_variante_id) {
                const { rows } = await dbClient.query(
                    `SELECT pv.nome_variante, pv.quantidade_estoque, pv.preco_adicional, p.nome, p.preco, p.preco_promocional
                     FROM produto_variantes pv
                     JOIN produtos p ON p.id = pv.produto_id
                     WHERE pv.id = $1 AND pv.deletado_em IS NULL FOR UPDATE`,
                    [item.produto_variante_id]
                );
                if (rows.length === 0) throw new Error('Variação de produto não encontrada.');

                const prod = rows[0];
                const basePrice = prod.preco_promocional > 0 ? parseFloat(prod.preco_promocional) : parseFloat(prod.preco);
                precoUnitario = basePrice + parseFloat(prod.preco_adicional);
                estoqueAtual = prod.quantidade_estoque;
                nomeItem = `${prod.nome} - ${prod.nome_variante}`;
            } else {
                const { rows } = await dbClient.query(
                    `SELECT nome, quantidade_estoque, preco, preco_promocional
                     FROM produtos WHERE id = $1 AND deletado_em IS NULL FOR UPDATE`,
                    [item.produto_id]
                );
                if (rows.length === 0) throw new Error('Produto não encontrado.');

                const prod = rows[0];
                precoUnitario = prod.preco_promocional > 0 ? parseFloat(prod.preco_promocional) : parseFloat(prod.preco);
                estoqueAtual = prod.quantidade_estoque;
                nomeItem = prod.nome;
            }

            if (estoqueAtual < item.quantidade) {
                throw new Error(`Estoque insuficiente para ${nomeItem}. Disponível: ${estoqueAtual}`);
            }

            somaProdutos += precoUnitario * item.quantidade;

            itensValidados.push({
                produto_id: item.produto_id,
                produto_variante_id: item.produto_variante_id || null,
                quantidade: item.quantidade,
                preco_no_momento_da_compra: precoUnitario
            });
        }

        // 2. Registra o pedido com o status 'pago' (já que é venda externa)
        const valorFinal = valorTotalPago !== undefined ? parseFloat(valorTotalPago) : somaProdutos;
        const descontoAplicado = Math.max(0, somaProdutos - valorFinal);

        const { rows: pedidoRows } = await dbClient.query(
            `INSERT INTO pedidos (cliente_id, valor_total, status, desconto_aplicado)
             VALUES ($1, $2, 'pago', $3) RETURNING *`,
            [clienteId || null, valorFinal, descontoAplicado]
        );
        const novoPedido = pedidoRows[0];

        // 3. Registra os itens e deduz o estoque em tempo real
        for (const item of itensValidados) {
            await dbClient.query(
                `INSERT INTO itens_pedido (pedido_id, produto_id, produto_variante_id, quantidade, preco_no_momento_da_compra)
                 VALUES ($1, $2, $3, $4, $5)`,
                [novoPedido.id, item.produto_id, item.produto_variante_id, item.quantidade, item.preco_no_momento_da_compra]
            );

            if (item.produto_variante_id) {
                await dbClient.query(
                    `UPDATE produto_variantes SET quantidade_estoque = quantidade_estoque - $1 WHERE id = $2`,
                    [item.quantidade, item.produto_variante_id]
                );
            } else {
                await dbClient.query(
                    `UPDATE produtos SET quantidade_estoque = quantidade_estoque - $1 WHERE id = $2`,
                    [item.quantidade, item.produto_id]
                );
            }
        }

        await dbClient.query('COMMIT');
        res.status(201).json({ message: 'Venda manual registrada com sucesso!', pedido: novoPedido });

    } catch (error) {
        await dbClient.query('ROLLBACK');
        console.error('Erro ao criar pedido manual:', error);
        res.status(400).json({ message: error.message || 'Erro ao processar o pedido manual.' });
    } finally {
        dbClient.release();
    }
};

// ─────────────────────────────────────────────────────────────────
// GET /api/pedidos/meus-pedidos
// ─────────────────────────────────────────────────────────────────
const getMyOrders = async (req, res) => {
    try {
        const search = req.query.search || '';
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

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
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
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
// ─────────────────────────────────────────────────────────────────
const TRANSICOES_VALIDAS = {
    pagamento_pendente: ['cancelado'],
    pago: ['em_separacao', 'cancelado'],
    em_separacao: ['enviado', 'cancelado'],
    enviado: ['entregue'],
};

const updateOrderStatus = async (req, res) => {
    const { id } = req.params;
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
    createManualOrder,
    getMyOrders,
    getAllOrders,
    getOrderDetails,
    updateOrderStatus,
    streamPaymentStatus,
    notificarPagamentoPix
};