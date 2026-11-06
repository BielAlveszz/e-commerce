const db = require('../database');

const precoEfetivo = (produto) => {
    const promo = parseFloat(produto.preco_promocional);
    return promo > 0 ? promo : parseFloat(produto.preco);
};

// ─────────────────────────────────────────────────────────────────
// create — cria pedido com transação atômica
// ─────────────────────────────────────────────────────────────────
const create = async (clienteId, cartItems, cupom = null, endereco = null) => {
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        let valorTotal = 0;
        const itensValidados = [];

        for (const item of cartItems) {
            // Verifica se o produto está ativo e NÃO foi deletado
            const { rows: pedidoRows } = await client.query(
                `INSERT INTO pedidos
                (cliente_id, valor_total, status, cupom_id, desconto_aplicado, endereco_id, endereco_snapshot)
             VALUES ($1, $2, 'pagamento_pendente', $3, $4, $5, $6)
             RETURNING id, codigo_rastreio, valor_total, status, criado_em`, // Retornamos o UUID
                [
                    clienteId,
                    valorFinal,
                    cupom?.id || null,
                    desconto,
                    endereco?.id || null,
                    endereco?.snapshot ? JSON.stringify(endereco.snapshot) : null,
                ]
            );

            if (rows.length === 0) {
                throw new Error(`Produto não encontrado, inativo ou esgotado (ID: ${item.id}).`);
            }

            const produto = rows[0];

            if (produto.quantidade_estoque < item.quantity) {
                throw new Error(
                    `"${produto.nome}" não tem estoque suficiente. ` +
                    `Disponível: ${produto.quantidade_estoque}, solicitado: ${item.quantity}.`
                );
            }

            const preco = precoEfetivo(produto);
            valorTotal += preco * item.quantity;

            itensValidados.push({
                produto_id: item.id,
                quantidade: item.quantity,
                preco_no_momento_da_compra: preco,
                // Aqui já deixamos o espaço para o ID da Variante que implementaremos no frontend depois
                produto_variante_id: item.variante_id || null
            });
        }

        const desconto = cupom ? Math.min(parseFloat(cupom.desconto), valorTotal) : 0;
        const valorFinal = parseFloat((valorTotal - desconto).toFixed(2));

        // Cria o pedido retornando o novo codigo_rastreio (UUID)
        const { rows: pedidoRows } = await client.query(
            `INSERT INTO pedidos
                (cliente_id, valor_total, status, cupom_id, desconto_aplicado)
             VALUES ($1, $2, 'pagamento_pendente', $3, $4)
             RETURNING id, codigo_rastreio, valor_total, status, criado_em`, // Retornamos o UUID
            [clienteId, valorFinal, cupom?.id || null, desconto]
        );
        const novoPedido = pedidoRows[0];

        for (const item of itensValidados) {
            await client.query(
                `INSERT INTO itens_pedido
                    (pedido_id, produto_id, produto_variante_id, quantidade, preco_no_momento_da_compra)
                 VALUES ($1, $2, $3, $4, $5)`,
                [novoPedido.id, item.produto_id, item.produto_variante_id, item.quantidade, item.preco_no_momento_da_compra]
            );

            // Reduz estoque (no futuro, se tiver variante_id, reduziremos da tabela de variantes)
            await client.query(
                `UPDATE produtos
                 SET quantidade_estoque = quantidade_estoque - $1
                 WHERE id = $2`,
                [item.quantidade, item.produto_id]
            );
        }

        await client.query('COMMIT');
        return novoPedido;

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const addPixInfo = async (pedidoId, pixCopyPaste, mercadoPagoId, qrCodeBase64) => {
    await db.query(
        `UPDATE pedidos
         SET pix_copia_cola     = $1,
             mercado_pago_id    = $2,
             pix_qrcode_base64  = $3
         WHERE id = $4`,
        [pixCopyPaste, mercadoPagoId, qrCodeBase64, pedidoId]
    );
};

// ─────────────────────────────────────────────────────────────────
// findByClient — Agora traz o codigo_rastreio (UUID)
// ─────────────────────────────────────────────────────────────────
const findByClient = async (clienteId, search = '', page = 1, limit = 10) => {
    const offset = (page - 1) * limit;
    const params = [clienteId];
    let whereExtra = '';

    if (search && search.trim()) {
        params.push('%' + search.trim() + '%');
        // Agora busca pelo UUID rastreio também
        whereExtra = ` AND (p.codigo_rastreio::text ILIKE $${params.length} OR pr.nome ILIKE $${params.length})`;
    }

    const countQuery = `
        SELECT COUNT(DISTINCT p.id) AS total
        FROM pedidos p
        LEFT JOIN itens_pedido ip ON ip.pedido_id = p.id
        LEFT JOIN produtos pr     ON pr.id = ip.produto_id
        WHERE p.cliente_id = $1
        ${whereExtra}
    `;

    const dataQuery = `
        SELECT
            p.id,
            p.codigo_rastreio, -- <<< UUID do Pedido
            p.valor_total,
            p.status,
            p.criado_em,
            p.pix_copia_cola,
            p.pix_qrcode_base64,
            p.desconto_aplicado,
            STRING_AGG(pr.nome, ', ' ORDER BY pr.nome) AS produtos_resumo
        FROM pedidos p
        LEFT JOIN itens_pedido ip ON ip.pedido_id = p.id
        LEFT JOIN produtos pr     ON pr.id = ip.produto_id
        WHERE p.cliente_id = $1
        ${whereExtra}
        GROUP BY p.id
        ORDER BY p.criado_em DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const [countResult, dataResult] = await Promise.all([
        db.query(countQuery, params),
        db.query(dataQuery, [...params, limit, offset]),
    ]);

    return {
        pedidos: dataResult.rows,
        total: parseInt(countResult.rows[0].total, 10),
        totalPages: Math.ceil(parseInt(countResult.rows[0].total, 10) / limit),
        currentPage: parseInt(page, 10),
    };
};

const findAll = async (page = 1, limit = 20, search = '') => {
    const offset = (page - 1) * limit;
    const params = [limit, offset];
    let whereClause = '';

    if (search && search.trim()) {
        params.push('%' + search.trim() + '%');
        whereClause = `WHERE (
            c.nome    ILIKE $${params.length} OR
            c.email   ILIKE $${params.length} OR
            p.codigo_rastreio::text ILIKE $${params.length}
        )`;
    }

    const { rows } = await db.query(
        `SELECT
            p.id,
            p.codigo_rastreio,
            p.valor_total,
            p.desconto_aplicado,
            p.status,
            p.criado_em,
            c.nome  AS cliente_nome,
            c.email AS cliente_email
         FROM pedidos p
         LEFT JOIN clientes c ON p.cliente_id = c.id
         ${whereClause}
         ORDER BY p.criado_em DESC
         LIMIT $1 OFFSET $2`,
        params
    );
    return rows;
};

const findByIdAndClientId = async (orderId, clienteId) => {
    const { rows: pedidoRows } = await db.query(
        'SELECT * FROM pedidos WHERE id = $1 AND cliente_id = $2',
        [orderId, clienteId]
    );

    if (pedidoRows.length === 0) return null;

    const { rows: itemsRows } = await db.query(
        `SELECT
            ip.quantidade,
            ip.preco_no_momento_da_compra,
            p.nome,
            p.url_imagem
         FROM itens_pedido ip
         JOIN produtos p ON ip.produto_id = p.id
         WHERE ip.pedido_id = $1`,
        [orderId]
    );

    return { pedido: pedidoRows[0], itens: itemsRows };
};

const updateStatusByMpId = async (mercadoPagoId, novoStatus) => {
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        const { rows } = await client.query(
            `UPDATE pedidos SET status = $1
             WHERE mercado_pago_id = $2
             RETURNING *`,
            [novoStatus, mercadoPagoId]
        );
        const pedido = rows[0];

        if (pedido && ['cancelado', 'expirado', 'recusado'].includes(novoStatus)) {
            await _devolverEstoque(client, pedido.id);
        }

        await client.query('COMMIT');
        return pedido;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const updateStatusById = async (pedidoId, novoStatus) => {
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        const { rows: atual } = await client.query(
            'SELECT status FROM pedidos WHERE id = $1',
            [pedidoId]
        );
        if (atual.length === 0) throw new Error('Pedido não encontrado.');

        const { rows } = await client.query(
            `UPDATE pedidos SET status = $1 WHERE id = $2 RETURNING *`,
            [novoStatus, pedidoId]
        );
        const pedido = rows[0];

        const statusQueDevolvemEstoque = ['pago', 'em_separacao'];
        if (novoStatus === 'cancelado' && statusQueDevolvemEstoque.includes(atual[0].status)) {
            await _devolverEstoque(client, pedidoId);
        }

        await client.query('COMMIT');
        return pedido;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const _devolverEstoque = async (client, pedidoId) => {
    // Agora temos que estar preparados para devolver o estoque pra variante, caso exista
    const { rows: itens } = await client.query(
        'SELECT produto_id, produto_variante_id, quantidade FROM itens_pedido WHERE pedido_id = $1',
        [pedidoId]
    );

    for (const item of itens) {
        if (item.produto_variante_id) {
            await client.query(
                `UPDATE produto_variantes
                 SET quantidade_estoque = quantidade_estoque + $1
                 WHERE id = $2`,
                [item.quantidade, item.produto_variante_id]
            );
        } else {
            await client.query(
                `UPDATE produtos
                 SET quantidade_estoque = quantidade_estoque + $1
                 WHERE id = $2`,
                [item.quantidade, item.produto_id]
            );
        }
    }
};

module.exports = {
    create,
    addPixInfo,
    findByClient,
    findAll,
    findByIdAndClientId,
    updateStatusByMpId,
    updateStatusById,
};