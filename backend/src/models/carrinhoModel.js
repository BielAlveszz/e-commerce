const db = require('../database');

const findOrCreate = async (clienteId) => {
    // Uma única query com CTE que garante o carrinho, atualiza a data e traz os itens!
    const query = `
        WITH carrinho_upsert AS (
            INSERT INTO carrinhos (cliente_id, atualizado_em)
            VALUES ($1, NOW())
            ON CONFLICT (cliente_id) DO UPDATE 
            SET atualizado_em = NOW()
            RETURNING id
        )
        SELECT
            ic.produto_id      AS id,
            ic.produto_variante_id AS variante_id,
            p.nome             AS nome_produto,
            pv.nome_variante,
            p.preco,
            p.preco_promocional,
            pv.preco_adicional,
            p.url_imagem,
            COALESCE(pv.quantidade_estoque, p.quantidade_estoque) AS quantidade_estoque,
            ic.quantidade      AS quantity
        FROM carrinho_upsert c
        JOIN itens_carrinho ic ON ic.carrinho_id = c.id
        JOIN produtos p        ON p.id = ic.produto_id
        LEFT JOIN produto_variantes pv ON pv.id = ic.produto_variante_id
        ORDER BY ic.id ASC;
    `;

    const { rows } = await db.query(query, [clienteId]);

    return rows.map(r => ({
        id: r.id,
        variante_id: r.variante_id,
        nome: r.variante_id ? `${r.nome_produto} - ${r.nome_variante}` : r.nome_produto,
        preco: r.preco,
        preco_promocional: r.preco_promocional,
        url_imagem: r.url_imagem,
        quantidade_estoque: r.quantidade_estoque,
        quantity: r.quantity,
        varianteSelecionada: r.variante_id ? {
            id: r.variante_id,
            nome_variante: r.nome_variante,
            preco_adicional: r.preco_adicional
        } : null
    }));
};

const upsertItem = async (clienteId, produtoId, quantidade, varianteId = null) => {
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        await client.query(`
            INSERT INTO carrinhos (cliente_id) VALUES ($1) ON CONFLICT (cliente_id) DO NOTHING
        `, [clienteId]);

        const { rows: carrinhoRows } = await client.query('SELECT id FROM carrinhos WHERE cliente_id = $1', [clienteId]);
        const carrinhoId = carrinhoRows[0].id;

        // Verifica o estoque correto (da Variante ou do Produto Pai)
        let estoqueMax = 0;
        let nomeItem = "";

        if (varianteId) {
            const { rows } = await client.query('SELECT quantidade_estoque, nome_variante FROM produto_variantes WHERE id = $1 AND deletado_em IS NULL', [varianteId]);
            if (!rows.length) throw new Error('Opção de produto não encontrada.');
            estoqueMax = rows[0].quantidade_estoque;
            nomeItem = rows[0].nome_variante;
        } else {
            const { rows } = await client.query('SELECT quantidade_estoque, nome FROM produtos WHERE id = $1 AND deletado_em IS NULL', [produtoId]);
            if (!rows.length) throw new Error('Produto não encontrado.');
            estoqueMax = rows[0].quantidade_estoque;
            nomeItem = rows[0].nome;
        }

        // Busca se esse item exato já está no carrinho (IS NOT DISTINCT FROM cuida do caso null)
        const { rows: itemAtual } = await client.query(`
            SELECT quantidade FROM itens_carrinho 
            WHERE carrinho_id = $1 AND produto_id = $2 AND produto_variante_id IS NOT DISTINCT FROM $3
        `, [carrinhoId, produtoId, varianteId]);

        const qtdAtual = itemAtual.length > 0 ? itemAtual[0].quantidade : 0;
        const qtdFinal = qtdAtual + quantidade;

        if (qtdFinal > estoqueMax) {
            throw new Error(`Estoque insuficiente. Disponível: ${estoqueMax}.`);
        }

        // Insere ou atualiza
        if (itemAtual.length > 0) {
            await client.query(`
                UPDATE itens_carrinho SET quantidade = $1 
                WHERE carrinho_id = $2 AND produto_id = $3 AND produto_variante_id IS NOT DISTINCT FROM $4
            `, [qtdFinal, carrinhoId, produtoId, varianteId]);
        } else {
            await client.query(`
                INSERT INTO itens_carrinho (carrinho_id, produto_id, produto_variante_id, quantidade) 
                VALUES ($1, $2, $3, $4)
            `, [carrinhoId, produtoId, varianteId, quantidade]);
        }

        await client.query('UPDATE carrinhos SET atualizado_em = NOW() WHERE id = $1', [carrinhoId]);
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

const updateItem = async (clienteId, produtoId, quantidade, varianteId = null) => {
    if (quantidade <= 0) {
        return removeItem(clienteId, produtoId, varianteId);
    }

    // Busca o estoque máximo para validação
    let estoqueMax = 0;
    if (varianteId) {
        const { rows } = await db.query('SELECT quantidade_estoque FROM produto_variantes WHERE id = $1', [varianteId]);
        estoqueMax = rows[0]?.quantidade_estoque || 0;
    } else {
        const { rows } = await db.query('SELECT quantidade_estoque FROM produtos WHERE id = $1', [produtoId]);
        estoqueMax = rows[0]?.quantidade_estoque || 0;
    }

    if (quantidade > estoqueMax) {
        throw new Error(`Estoque insuficiente. Disponível: ${estoqueMax}.`);
    }

    await db.query(`
        UPDATE itens_carrinho ic
        SET quantidade = $1
        FROM carrinhos c
        WHERE ic.carrinho_id = c.id
          AND c.cliente_id   = $2
          AND ic.produto_id  = $3
          AND ic.produto_variante_id IS NOT DISTINCT FROM $4
    `, [quantidade, clienteId, produtoId, varianteId]);
};

const removeItem = async (clienteId, produtoId, varianteId = null) => {
    await db.query(`
        DELETE FROM itens_carrinho ic
        USING carrinhos c
        WHERE ic.carrinho_id = c.id
          AND c.cliente_id   = $1
          AND ic.produto_id  = $2
          AND ic.produto_variante_id IS NOT DISTINCT FROM $3
    `, [clienteId, produtoId, varianteId]);
};

const clearCart = async (clienteId) => {
    await db.query(`
        DELETE FROM itens_carrinho ic USING carrinhos c WHERE ic.carrinho_id = c.id AND c.cliente_id = $1
    `, [clienteId]);
};

const mergeCart = async (clienteId, localItems) => {
    if (!localItems || localItems.length === 0) return;

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        await client.query(`
            INSERT INTO carrinhos (cliente_id) VALUES ($1) ON CONFLICT (cliente_id) DO NOTHING
        `, [clienteId]);

        const { rows: carrinhoRows } = await client.query('SELECT id FROM carrinhos WHERE cliente_id = $1', [clienteId]);
        const carrinhoId = carrinhoRows[0].id;

        for (const item of localItems) {
            const varianteId = item.variante_id || null;
            let maxQtd = 0;

            if (varianteId) {
                const { rows } = await client.query('SELECT quantidade_estoque FROM produto_variantes WHERE id = $1 AND deletado_em IS NULL', [varianteId]);
                if (rows.length === 0) continue;
                maxQtd = rows[0].quantidade_estoque;
            } else {
                const { rows } = await client.query('SELECT quantidade_estoque FROM produtos WHERE id = $1 AND esta_ativo = TRUE AND deletado_em IS NULL', [item.id]);
                if (rows.length === 0) continue;
                maxQtd = rows[0].quantidade_estoque;
            }

            const { rows: existing } = await client.query(`
                SELECT quantidade FROM itens_carrinho 
                WHERE carrinho_id = $1 AND produto_id = $2 AND produto_variante_id IS NOT DISTINCT FROM $3
            `, [carrinhoId, item.id, varianteId]);

            const qtdAtual = existing.length > 0 ? existing[0].quantidade : 0;
            const qtdMerge = Math.min(qtdAtual + (item.quantity || 1), maxQtd);

            if (existing.length > 0) {
                await client.query(`
                    UPDATE itens_carrinho SET quantidade = $1 
                    WHERE carrinho_id = $2 AND produto_id = $3 AND produto_variante_id IS NOT DISTINCT FROM $4
                `, [qtdMerge, carrinhoId, item.id, varianteId]);
            } else {
                await client.query(`
                    INSERT INTO itens_carrinho (carrinho_id, produto_id, produto_variante_id, quantidade) 
                    VALUES ($1, $2, $3, $4)
                `, [carrinhoId, item.id, varianteId, qtdMerge]);
            }
        }

        await client.query('UPDATE carrinhos SET atualizado_em = NOW() WHERE id = $1', [carrinhoId]);
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
    mergeCart
};