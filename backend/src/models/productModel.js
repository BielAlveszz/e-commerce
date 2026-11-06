const db = require('../database');

// ─────────────────────────────────────────────────────────────────
// MOTOR DE BUSCA AVANÇADO (COM FILTROS E ORDENAÇÃO)
// ─────────────────────────────────────────────────────────────────
const findAll = async ({ search, page = 1, limit = 20, categoria, subcategoria, minPrice, maxPrice, sort }) => {
    const offset = (page - 1) * limit;
    const queryParams = [];
    
    let countQuery = 'SELECT COUNT(p.*) FROM produtos p';
    let dataQuery = 'SELECT p.* FROM produtos p';

    // 1. JOINS (Categorias)
    if (categoria || subcategoria) {
        countQuery += ' INNER JOIN sub_categorias sc ON p.sub_categoria_id = sc.id';
        dataQuery += ' INNER JOIN sub_categorias sc ON p.sub_categoria_id = sc.id';
        if (categoria) {
            countQuery += ' INNER JOIN categorias c ON sc.categoria_id = c.id';
            dataQuery += ' INNER JOIN categorias c ON sc.categoria_id = c.id';
        }
    }

    // 2. WHERE (Condições Iniciais)
    countQuery += ' WHERE p.esta_ativo = TRUE AND p.deletado_em IS NULL';
    dataQuery += ' WHERE p.esta_ativo = TRUE AND p.deletado_em IS NULL';

    // Filtro: Busca por texto (Nome)
    if (search) {
        queryParams.push(`%${search}%`);
        countQuery += ` AND p.nome ILIKE $${queryParams.length}`;
        dataQuery += ` AND p.nome ILIKE $${queryParams.length}`;
    }
    
    // Filtro: Subcategoria
    if (subcategoria) {
        queryParams.push(subcategoria);
        countQuery += ` AND sc.nome = $${queryParams.length}`;
        dataQuery += ` AND sc.nome = $${queryParams.length}`;
    }
    
    // Filtro: Categoria
    if (categoria) {
        queryParams.push(categoria);
        countQuery += ` AND c.nome = $${queryParams.length}`;
        dataQuery += ` AND c.nome = $${queryParams.length}`;
    }

    // Filtro: Preço Mínimo e Máximo (Inteligente com Preço Promocional)
    if (minPrice) {
        queryParams.push(parseFloat(minPrice));
        // COALESCE(NULLIF(x, 0), y) -> Usa x se existir e não for 0. Senão, usa y.
        const priceCalc = `COALESCE(NULLIF(p.preco_promocional, 0), p.preco)`;
        countQuery += ` AND ${priceCalc} >= $${queryParams.length}`;
        dataQuery  += ` AND ${priceCalc} >= $${queryParams.length}`;
    }
    if (maxPrice) {
        queryParams.push(parseFloat(maxPrice));
        const priceCalc = `COALESCE(NULLIF(p.preco_promocional, 0), p.preco)`;
        countQuery += ` AND ${priceCalc} <= $${queryParams.length}`;
        dataQuery  += ` AND ${priceCalc} <= $${queryParams.length}`;
    }

    // Executa a contagem total para a paginação
    const countResult = await db.query(countQuery, queryParams);
    const totalProducts = parseInt(countResult.rows[0].count, 10);
    
    // 3. ORDENAÇÃO (Sort)
    let orderClause = ' ORDER BY p.id ASC'; // Padrão
    
    if (sort === 'menor_preco') {
        orderClause = ' ORDER BY COALESCE(NULLIF(p.preco_promocional, 0), p.preco) ASC';
    } else if (sort === 'maior_preco') {
        orderClause = ' ORDER BY COALESCE(NULLIF(p.preco_promocional, 0), p.preco) DESC';
    } else if (sort === 'mais_recentes') {
        orderClause = ' ORDER BY p.id DESC';
    }

    // 4. PAGINAÇÃO E EXECUÇÃO
    queryParams.push(limit, offset);
    dataQuery += `${orderClause} LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`;
    
    const { rows: products } = await db.query(dataQuery, queryParams);
    
    return {
        products,
        totalPages: Math.ceil(totalProducts / limit),
        currentPage: parseInt(page, 10),
        totalProducts // Útil para mostrar no Frontend "Exibindo X de Y produtos"
    };
};

// ─────────────────────────────────────────────────────────────────
// Busca Produto E suas Variantes
// ─────────────────────────────────────────────────────────────────
const findById = async (id) => {
    const query = `
        SELECT p.*, sc.categoria_id
        FROM produtos p
        JOIN sub_categorias sc ON p.sub_categoria_id = sc.id
        WHERE p.id = $1 AND p.deletado_em IS NULL
    `;
    const { rows } = await db.query(query, [id]);
    const produto = rows[0];

    if (!produto) return null;

    // Busca e acopla as variantes ao produto
    const { rows: variantes } = await db.query(
        'SELECT id, sku, nome_variante, quantidade_estoque, preco_adicional FROM produto_variantes WHERE produto_id = $1 AND deletado_em IS NULL ORDER BY id ASC',
        [id]
    );

    produto.variantes = variantes;
    return produto;
};

const findOnSale = async () => {
    const { rows } = await db.query('SELECT * FROM produtos WHERE preco_promocional > 0 AND esta_ativo = TRUE AND deletado_em IS NULL');
    return { products: rows };
};

// ─────────────────────────────────────────────────────────────────
// Criação com Transação Atômica
// ─────────────────────────────────────────────────────────────────
const create = async (dados) => {
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        // 1. Cria o Produto
        const { rows } = await client.query(
            'INSERT INTO produtos (nome, descricao, preco, quantidade_estoque, url_imagem, sub_categoria_id, preco_promocional) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [dados.nome, dados.descricao, dados.preco, dados.quantidade_estoque, dados.url_imagem, dados.sub_categoria_id, dados.preco_promocional]
        );
        const novoProduto = rows[0];

        // 2. Cria as Variantes
        novoProduto.variantes = [];
        if (dados.variantes && dados.variantes.length > 0) {
            for (const v of dados.variantes) {
                const { rows: vRows } = await client.query(
                    'INSERT INTO produto_variantes (produto_id, sku, nome_variante, quantidade_estoque, preco_adicional) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                    [novoProduto.id, v.sku || null, v.nome_variante, v.quantidade_estoque, v.preco_adicional || 0]
                );
                novoProduto.variantes.push(vRows[0]);
            }
        }

        await client.query('COMMIT');
        return novoProduto;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

// ─────────────────────────────────────────────────────────────────
// Edição e Soft Delete das Variantes
// ─────────────────────────────────────────────────────────────────
const update = async (id, dados) => {
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        const { rows } = await client.query(
            'UPDATE produtos SET nome = $1, descricao = $2, preco = $3, quantidade_estoque = $4, url_imagem = $5, sub_categoria_id = $6, preco_promocional = $7 WHERE id = $8 AND deletado_em IS NULL RETURNING *',
            [dados.nome, dados.descricao, dados.preco, dados.quantidade_estoque, dados.url_imagem, dados.sub_categoria_id, dados.preco_promocional, id]
        );
        const produto = rows[0];
        
        if (!produto) {
            await client.query('ROLLBACK');
            return null;
        }

        // Lida com as variantes
        if (dados.variantes) {
            const idsVariantesAtivas = dados.variantes.filter(v => v.id).map(v => v.id);
            
            // Faz Soft Delete nas variantes que foram deletadas no Frontend
            if (idsVariantesAtivas.length > 0) {
                await client.query(
                    `UPDATE produto_variantes SET deletado_em = NOW() WHERE produto_id = $1 AND id != ALL($2::int[])`,
                    [id, idsVariantesAtivas]
                );
            } else {
                await client.query(
                    `UPDATE produto_variantes SET deletado_em = NOW() WHERE produto_id = $1`,
                    [id]
                );
            }

            // Atualiza ou Insere as novas variantes
            produto.variantes = [];
            for (const v of dados.variantes) {
                if (v.id) {
                    const { rows: vRows } = await client.query(
                        'UPDATE produto_variantes SET sku = $1, nome_variante = $2, quantidade_estoque = $3, preco_adicional = $4, deletado_em = NULL WHERE id = $5 RETURNING *',
                        [v.sku || null, v.nome_variante, v.quantidade_estoque, v.preco_adicional || 0, v.id]
                    );
                    produto.variantes.push(vRows[0]);
                } else {
                    const { rows: vRows } = await client.query(
                        'INSERT INTO produto_variantes (produto_id, sku, nome_variante, quantidade_estoque, preco_adicional) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                        [id, v.sku || null, v.nome_variante, v.quantidade_estoque, v.preco_adicional || 0]
                    );
                    produto.variantes.push(vRows[0]);
                }
            }
        }

        await client.query('COMMIT');
        return produto;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

const remove = async (id) => {
    const result = await db.query(
        'UPDATE produtos SET deletado_em = NOW(), esta_ativo = FALSE WHERE id = $1', 
        [id]
    );
    return result.rowCount;
};

const findBestsellers = async () => {
    const query = `
        SELECT p.*, SUM(ip.quantidade) as total_vendido
        FROM produtos p
        JOIN itens_pedido ip ON p.id = ip.produto_id
        WHERE p.esta_ativo = TRUE AND p.deletado_em IS NULL
        GROUP BY p.id
        ORDER BY total_vendido DESC
        LIMIT 8; 
    `;
    const { rows } = await db.query(query);
    return { products: rows };
};

const findLatest = async () => {
    const query = `
        SELECT * FROM produtos
        WHERE esta_ativo = TRUE AND deletado_em IS NULL
        ORDER BY id DESC
        LIMIT 8;
    `;
    const { rows } = await db.query(query);
    return { products: rows };
};

const updateEstoque = async (id, quantidade) => {
    const { rows } = await db.query(
        'UPDATE produtos SET quantidade_estoque = $1 WHERE id = $2 AND deletado_em IS NULL RETURNING id, nome, quantidade_estoque',
        [quantidade, id]
    );
    return rows[0];
};

const findRelated = async (produtoId, subCategoriaId, limit = 4) => {
    const { rows } = await db.query(`
        SELECT id, nome, preco, preco_promocional, url_imagem, quantidade_estoque
        FROM produtos
        WHERE sub_categoria_id = $1
          AND id != $2
          AND esta_ativo = TRUE
          AND deletado_em IS NULL
        ORDER BY RANDOM()
        LIMIT $3
    `, [subCategoriaId, produtoId, limit]);
    return rows;
};

module.exports = {
    findAll,
    findById,
    findOnSale,
    findBestsellers,
    findLatest,
    create,
    update,
    remove,
    findRelated,
    updateEstoque,
};