const db = require('../database');

const create = async (clienteId, valorTotal, cartItems) => {
    // Inicia criando o pedido para obter um ID
    const { rows: pedidoRows } = await db.query(
        'INSERT INTO "pedidos" (cliente_id, valor_total, status) VALUES ($1, $2, $3) RETURNING *',
        [clienteId, valorTotal, 'pagamento_pendente']
    );
    const novoPedido = pedidoRows[0];

    // Em seguida, para cada item do carrinho, insere em "itens_pedido" e atualiza o estoque
    for (const item of cartItems) {
        const produto = (await db.query('SELECT preco FROM "produtos" WHERE id = $1', [item.id])).rows[0];
        await db.query('INSERT INTO "itens_pedido" (pedido_id, produto_id, quantidade, preco_no_momento_da_compra) VALUES ($1, $2, $3, $4)', [novoPedido.id, item.id, item.quantity, produto.preco]);
        await db.query('UPDATE "produtos" SET quantidade_estoque = quantidade_estoque - $1 WHERE id = $2', [item.quantity, item.id]);
    }

    return novoPedido;
};

const addPixInfo = async (pedidoId, pixCopyPaste, mercadoPagoId, qrCodeBase64) => {
    await db.query(
        'UPDATE pedidos SET pix_copia_cola = $1, mercado_pago_id = $2, pix_qrcode_base64 = $3 WHERE id = $4', 
        [pixCopyPaste, mercadoPagoId, qrCodeBase64, pedidoId]
    );
};

const findByClient = async (clienteId) => {
    const { rows } = await db.query('SELECT * FROM pedidos WHERE cliente_id = $1 ORDER BY criado_em DESC', [clienteId]);
    return rows;
};

const findAll = async () => {
    const { rows } = await db.query(`
        SELECT p.id, p.valor_total, p.status, p.criado_em, c.nome AS cliente_nome, c.email AS cliente_email
        FROM pedidos p LEFT JOIN clientes c ON p.cliente_id = c.id
        ORDER BY p.criado_em DESC
    `);
    return rows;
};

const updateStatusByMpId = async (mercadoPagoId, status) => {
    const { rows } = await db.query(
        'UPDATE pedidos SET status = $1 WHERE mercado_pago_id = $2 RETURNING *',
        [status, mercadoPagoId]
    );
    return rows[0];
};

const findByIdAndClientId = async (orderId, clienteId) => {
    const { rows: pedidoRows } = await db.query(
        'SELECT * FROM pedidos WHERE id = $1 AND cliente_id = $2',
        [orderId, clienteId]
    );

    if (pedidoRows.length === 0) {
        return null;
    }

    const { rows: itemsRows } = await db.query(`
        SELECT 
            ip.quantidade, 
            ip.preco_no_momento_da_compra,
            p.nome,
            p.url_imagem
        FROM itens_pedido ip
        JOIN produtos p ON ip.produto_id = p.id
        WHERE ip.pedido_id = $1
    `, [orderId]);

    return {
        pedido: pedidoRows[0],
        itens: itemsRows
    };
};

module.exports = {
    create,
    addPixInfo,
    findByClient,
    findAll,
    updateStatusByMpId,
    findByIdAndClientId,
};