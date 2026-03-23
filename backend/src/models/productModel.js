const db = require('../database');

const findAll = async ({ search, page = 1, limit = 20, categoria, subcategoria }) => {
    const offset = (page - 1) * limit;
    const queryParams = [];
    
    // Base da consulta
    let countQuery = 'SELECT COUNT(p.*) FROM produtos p';
    let dataQuery = 'SELECT p.* FROM produtos p';

    // Joins para filtrar por nome de categoria/subcategoria
    if (categoria || subcategoria) {
        countQuery += ' INNER JOIN sub_categorias sc ON p.sub_categoria_id = sc.id';
        dataQuery += ' INNER JOIN sub_categorias sc ON p.sub_categoria_id = sc.id';
        if (categoria) {
            countQuery += ' INNER JOIN categorias c ON sc.categoria_id = c.id';
            dataQuery += ' INNER JOIN categorias c ON sc.categoria_id = c.id';
        }
    }

    countQuery += ' WHERE p.esta_ativo = TRUE';
    dataQuery += ' WHERE p.esta_ativo = TRUE';

    if (search) {
        queryParams.push(`%${search}%`);
        countQuery += ` AND p.nome ILIKE $${queryParams.length}`;
        dataQuery += ` AND p.nome ILIKE $${queryParams.length}`;
    }
    if (subcategoria) {
        queryParams.push(subcategoria);
        countQuery += ` AND sc.nome = $${queryParams.length}`;
        dataQuery += ` AND sc.nome = $${queryParams.length}`;
    }
    if (categoria) {
        queryParams.push(categoria);
        countQuery += ` AND c.nome = $${queryParams.length}`;
        dataQuery += ` AND c.nome = $${queryParams.length}`;
    }

    const countResult = await db.query(countQuery, queryParams);
    const totalProducts = parseInt(countResult.rows[0].count, 10);
    
    queryParams.push(limit, offset);
    dataQuery += ` ORDER BY p.id ASC LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`;
    
    const { rows: products } = await db.query(dataQuery, queryParams);
    
    return {
        products,
        totalPages: Math.ceil(totalProducts / limit),
        currentPage: parseInt(page, 10),
    };
};

const findById = async (id) => {
    // CORREÇÃO: Adicionamos um JOIN para buscar também o ID da categoria principal
    const query = `
        SELECT p.*, sc.categoria_id
        FROM produtos p
        JOIN sub_categorias sc ON p.sub_categoria_id = sc.id
        WHERE p.id = $1
    `;
    const { rows } = await db.query(query, [id]);
    return rows[0];
};

const findOnSale = async () => {
    const { rows } = await db.query('SELECT * FROM produtos WHERE preco_promocional > 0 AND esta_ativo = TRUE');
    return { products: rows };
};

const create = async ({ nome, descricao, preco, quantidade_estoque, url_imagem, sub_categoria_id, preco_promocional }) => {
    const { rows } = await db.query(
        'INSERT INTO produtos (nome, descricao, preco, quantidade_estoque, url_imagem, sub_categoria_id, preco_promocional) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [nome, descricao, preco, quantidade_estoque, url_imagem, sub_categoria_id, preco_promocional]
    );
    return rows[0];
};

const update = async (id, { nome, descricao, preco, quantidade_estoque, url_imagem, sub_categoria_id, preco_promocional }) => {
    const { rows } = await db.query(
        'UPDATE produtos SET nome = $1, descricao = $2, preco = $3, quantidade_estoque = $4, url_imagem = $5, sub_categoria_id = $6, preco_promocional = $7 WHERE id = $8 RETURNING *',
        [nome, descricao, preco, quantidade_estoque, url_imagem, sub_categoria_id, preco_promocional, id]
    );
    return rows[0];
};

const remove = async (id) => {
    const result = await db.query('DELETE FROM produtos WHERE id = $1', [id]);
    return result.rowCount;
};

const findBestsellers = async () => {
    const query = `
        SELECT p.*, SUM(ip.quantidade) as total_vendido
        FROM produtos p
        JOIN itens_pedido ip ON p.id = ip.produto_id
        WHERE p.esta_ativo = TRUE
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
        WHERE esta_ativo = TRUE
        ORDER BY id DESC
        LIMIT 8;
    `;
    const { rows } = await db.query(query);
    return { products: rows };
};

const updateEstoque = async (id, quantidade) => {
    const { rows } = await db.query(
        'UPDATE produtos SET quantidade_estoque = $1 WHERE id = $2 RETURNING id, nome, quantidade_estoque',
        [quantidade, id]
    );
    return rows[0];
};


const findRelated = async (produtoId, subCategoriaId, limit = 4) => {
    // Busca produtos da mesma sub-categoria, excluindo o produto atual
    const { rows } = await db.query(`
        SELECT id, nome, preco, preco_promocional, url_imagem, quantidade_estoque
        FROM produtos
        WHERE sub_categoria_id = $1
          AND id != $2
          AND esta_ativo = TRUE
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