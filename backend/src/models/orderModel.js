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

const addPixInfo = async (pedidoId, pixCopyPaste, mercadoPagoId) => {
    await db.query('UPDATE "pedidos" SET chave_pix = $1, mercado_pago_id = $2 WHERE id = $3', 
        [pixCopyPaste, mercadoPagoId, pedidoId]);
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

module.exports = {
    create,
    addPixInfo,
    findByClient,
    findAll,
    updateStatusByMpId,
};