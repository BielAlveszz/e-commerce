const db = require('../database');

// Busca ou cria o carrinho do cliente.
// Retorna o carrinho com todos os itens e dados dos produtos.
const findOrCreate = async (clienteId) => {
    // Garante que o carrinho existe (cria se não tiver)
    await db.query(`
        INSERT INTO carrinhos (cliente_id)
        VALUES ($1)
        ON CONFLICT (cliente_id) DO NOTHING
    `, [clienteId]);

    // Atualiza o timestamp
    await db.query(`
        UPDATE carrinhos SET atualizado_em = NOW() WHERE cliente_id = $1
    `, [clienteId]);

    // Retorna o carrinho com itens e dados completos do produto
    const { rows } = await db.query(`
        SELECT
            ic.produto_id      AS id,
            p.nome,
            p.preco,
            p.preco_promocional,
            p.url_imagem,
            p.quantidade_estoque,
            ic.quantidade      AS quantity
        FROM carrinhos c
        JOIN itens_carrinho ic ON ic.carrinho_id = c.id
        JOIN produtos p        ON p.id = ic.produto_id
        WHERE c.cliente_id = $1
        ORDER BY ic.id ASC
    `, [clienteId]);

    return rows;
};

// Adiciona um item ao carrinho. Se já existir, incrementa a quantidade.
// Valida se há estoque suficiente antes de adicionar.
const upsertItem = async (clienteId, produtoId, quantidade) => {
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        // Garante que o carrinho existe
        await client.query(`
            INSERT INTO carrinhos (cliente_id)
            VALUES ($1)
            ON CONFLICT (cliente_id) DO NOTHING
        `, [clienteId]);

        const { rows: carrinhoRows } = await client.query(
            'SELECT id FROM carrinhos WHERE cliente_id = $1',
            [clienteId]
        );
        const carrinhoId = carrinhoRows[0].id;

        // Verifica estoque disponível
        const { rows: produtoRows } = await client.query(
            'SELECT quantidade_estoque, nome FROM produtos WHERE id = $1',
            [produtoId]
        );

        if (produtoRows.length === 0) {
            throw new Error('Produto não encontrado.');
        }

        // Quantidade já no carrinho
        const { rows: itemAtual } = await client.query(
            'SELECT quantidade FROM itens_carrinho WHERE carrinho_id = $1 AND produto_id = $2',
            [carrinhoId, produtoId]
        );

        const qtdAtual = itemAtual.length > 0 ? itemAtual[0].quantidade : 0;
        const qtdFinal = qtdAtual + quantidade;

        if (qtdFinal > produtoRows[0].quantidade_estoque) {
            throw new Error(
                `Estoque insuficiente para "${produtoRows[0].nome}". Disponível: ${produtoRows[0].quantidade_estoque}.`
            );
        }

        // Insere ou incrementa
        await client.query(`
            INSERT INTO itens_carrinho (carrinho_id, produto_id, quantidade)
            VALUES ($1, $2, $3)
            ON CONFLICT (carrinho_id, produto_id)
            DO UPDATE SET quantidade = itens_carrinho.quantidade + $3
        `, [carrinhoId, produtoId, quantidade]);

        await client.query(
            'UPDATE carrinhos SET atualizado_em = NOW() WHERE id = $1',
            [carrinhoId]
        );

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

// Atualiza a quantidade de um item. Se quantidade <= 0, remove o item.
const updateItem = async (clienteId, produtoId, quantidade) => {
    if (quantidade <= 0) {
        return removeItem(clienteId, produtoId);
    }

    // Valida estoque
    const { rows: produtoRows } = await db.query(
        'SELECT quantidade_estoque, nome FROM produtos WHERE id = $1',
        [produtoId]
    );

    if (quantidade > produtoRows[0].quantidade_estoque) {
        throw new Error(
            `Estoque insuficiente para "${produtoRows[0].nome}". Disponível: ${produtoRows[0].quantidade_estoque}.`
        );
    }

    await db.query(`
        UPDATE itens_carrinho ic
        SET quantidade = $1
        FROM carrinhos c
        WHERE ic.carrinho_id = c.id
          AND c.cliente_id   = $2
          AND ic.produto_id  = $3
    `, [quantidade, clienteId, produtoId]);
};

// Remove um item específico do carrinho
const removeItem = async (clienteId, produtoId) => {
    await db.query(`
        DELETE FROM itens_carrinho ic
        USING carrinhos c
        WHERE ic.carrinho_id = c.id
          AND c.cliente_id   = $1
          AND ic.produto_id  = $2
    `, [clienteId, produtoId]);
};

// Limpa todos os itens do carrinho (usado após checkout)
const clearCart = async (clienteId) => {
    await db.query(`
        DELETE FROM itens_carrinho ic
        USING carrinhos c
        WHERE ic.carrinho_id = c.id
          AND c.cliente_id = $1
    `, [clienteId]);
};

// Merge do carrinho anônimo (localStorage) com o carrinho do banco no login.
// Para cada item local: se já existe no banco soma as quantidades, se não existe insere.
const mergeCart = async (clienteId, localItems) => {
    if (!localItems || localItems.length === 0) return;

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        await client.query(`
            INSERT INTO carrinhos (cliente_id)
            VALUES ($1)
            ON CONFLICT (cliente_id) DO NOTHING
        `, [clienteId]);

        const { rows: carrinhoRows } = await client.query(
            'SELECT id FROM carrinhos WHERE cliente_id = $1',
            [clienteId]
        );
        const carrinhoId = carrinhoRows[0].id;

        for (const item of localItems) {
            // Verifica estoque
            const { rows: prodRows } = await client.query(
                'SELECT quantidade_estoque FROM produtos WHERE id = $1 AND esta_ativo = TRUE',
                [item.id]
            );
            if (prodRows.length === 0) continue;

            const maxQtd = prodRows[0].quantidade_estoque;

            // Quantidade já no banco
            const { rows: existing } = await client.query(
                'SELECT quantidade FROM itens_carrinho WHERE carrinho_id = $1 AND produto_id = $2',
                [carrinhoId, item.id]
            );

            const qtdAtual  = existing.length > 0 ? existing[0].quantidade : 0;
            const qtdMerge  = Math.min(qtdAtual + (item.quantity || 1), maxQtd);

            await client.query(`
                INSERT INTO itens_carrinho (carrinho_id, produto_id, quantidade)
                VALUES ($1, $2, $3)
                ON CONFLICT (carrinho_id, produto_id)
                DO UPDATE SET quantidade = $3
            `, [carrinhoId, item.id, qtdMerge]);
        }

        await client.query(
            'UPDATE carrinhos SET atualizado_em = NOW() WHERE id = $1',
            [carrinhoId]
        );

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

module.exports = {
    findOrCreate,
    upsertItem,
    updateItem,
    removeItem,
    clearCart,
    mergeCart,
};