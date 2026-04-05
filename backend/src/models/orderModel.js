const db = require('../database');

// ─────────────────────────────────────────────────────────────────
// Helper: retorna o preço efetivo do item (promocional se existir)
// CORREÇÃO CRÍTICA: o modelo anterior sempre usava `preco`,
// ignorando `preco_promocional` e cobrando o valor cheio mesmo
// em produtos com desconto ativo.
// ─────────────────────────────────────────────────────────────────
const precoEfetivo = (produto) => {
    const promo = parseFloat(produto.preco_promocional);
    return promo > 0 ? promo : parseFloat(produto.preco);
};

// ─────────────────────────────────────────────────────────────────
// create — cria pedido com transação atômica
// Valida estoque, aplica preço correto (promo ou normal),
// desconta cupom, registra tudo e subtrai estoque de uma vez.
// ─────────────────────────────────────────────────────────────────
const create = async (clienteId, cartItems, cupom = null) => {
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        let valorTotal = 0;
        const itensValidados = [];

        // 1. Valida estoque e trava as linhas (FOR UPDATE evita race condition)
        for (const item of cartItems) {
            const { rows } = await client.query(
                `SELECT id, nome, preco, preco_promocional, quantidade_estoque
                 FROM produtos
                 WHERE id = $1 AND esta_ativo = TRUE
                 FOR UPDATE`,
                [item.id]
            );

            if (rows.length === 0) {
                throw new Error(`Produto não encontrado ou inativo (ID: ${item.id}).`);
            }

            const produto = rows[0];

            if (produto.quantidade_estoque < item.quantity) {
                throw new Error(
                    `"${produto.nome}" não tem estoque suficiente. ` +
                    `Disponível: ${produto.quantidade_estoque}, solicitado: ${item.quantity}.`
                );
            }

            // CORREÇÃO: usa preço promocional quando disponível
            const preco = precoEfetivo(produto);
            valorTotal += preco * item.quantity;

            itensValidados.push({
                produto_id:                item.id,
                quantidade:                item.quantity,
                preco_no_momento_da_compra: preco,
            });
        }

        // 2. Aplica desconto do cupom (sem deixar valor negativo)
        const desconto    = cupom ? Math.min(parseFloat(cupom.desconto), valorTotal) : 0;
        const valorFinal  = parseFloat((valorTotal - desconto).toFixed(2));

        // 3. Cria o pedido mestre
        // MELHORIA: registra cupom_id e desconto_aplicado para auditoria
        const { rows: pedidoRows } = await client.query(
            `INSERT INTO pedidos
                (cliente_id, valor_total, status, cupom_id, desconto_aplicado)
             VALUES ($1, $2, 'pagamento_pendente', $3, $4)
             RETURNING *`,
            [clienteId, valorFinal, cupom?.id || null, desconto]
        );
        const novoPedido = pedidoRows[0];

        // 4. Insere itens e desconta estoque atomicamente
        for (const item of itensValidados) {
            await client.query(
                `INSERT INTO itens_pedido
                    (pedido_id, produto_id, quantidade, preco_no_momento_da_compra)
                 VALUES ($1, $2, $3, $4)`,
                [novoPedido.id, item.produto_id, item.quantidade, item.preco_no_momento_da_compra]
            );

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

// ─────────────────────────────────────────────────────────────────
// addPixInfo — salva dados do PIX gerado pelo Mercado Pago
// ─────────────────────────────────────────────────────────────────
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
// findByClient — pedidos do cliente com paginação
// MELHORIA: adicionada paginação para clientes com muitos pedidos
// ─────────────────────────────────────────────────────────────────
const findByClient = async (clienteId, search = '', page = 1, limit = 10) => {
    const offset = (page - 1) * limit;
    const params = [clienteId];
    let whereExtra = '';

    if (search && search.trim()) {
        params.push('%' + search.trim() + '%');
        whereExtra = ` AND (p.id::text ILIKE $${params.length} OR pr.nome ILIKE $${params.length})`;
    }

    // Contagem total para paginação
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
        pedidos:     dataResult.rows,
        total:       parseInt(countResult.rows[0].total, 10),
        totalPages:  Math.ceil(parseInt(countResult.rows[0].total, 10) / limit),
        currentPage: parseInt(page, 10),
    };
};

// ─────────────────────────────────────────────────────────────────
// findAll — todos os pedidos (admin) com paginação e busca
// ─────────────────────────────────────────────────────────────────
const findAll = async (page = 1, limit = 20, search = '') => {
    const offset = (page - 1) * limit;
    const params = [limit, offset];
    let whereClause = '';

    if (search && search.trim()) {
        params.push('%' + search.trim() + '%');
        whereClause = `WHERE (
            c.nome    ILIKE $${params.length} OR
            c.email   ILIKE $${params.length} OR
            p.id::text ILIKE $${params.length}
        )`;
    }

    const { rows } = await db.query(
        `SELECT
            p.id,
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

// ─────────────────────────────────────────────────────────────────
// findByIdAndClientId — detalhe de um pedido (cliente)
// ─────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────
// updateStatusByMpId — atualiza status via webhook do Mercado Pago
// Devolve estoque se o pagamento foi cancelado/expirado
// ─────────────────────────────────────────────────────────────────
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

        // Devolve estoque em pagamentos cancelados ou expirados
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

// ─────────────────────────────────────────────────────────────────
// updateStatusById — atualiza status pelo admin
// Devolve estoque ao cancelar pedido pago ou em separação
// ─────────────────────────────────────────────────────────────────
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

        // Devolve estoque se o pedido foi cancelado enquanto já estava pago ou em separação
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

// ─────────────────────────────────────────────────────────────────
// _devolverEstoque — helper interno (não exportado)
// Incrementa o estoque dos itens de um pedido cancelado
// ─────────────────────────────────────────────────────────────────
const _devolverEstoque = async (client, pedidoId) => {
    const { rows: itens } = await client.query(
        'SELECT produto_id, quantidade FROM itens_pedido WHERE pedido_id = $1',
        [pedidoId]
    );
    for (const item of itens) {
        await client.query(
            `UPDATE produtos
             SET quantidade_estoque = quantidade_estoque + $1
             WHERE id = $2`,
            [item.quantidade, item.produto_id]
        );
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