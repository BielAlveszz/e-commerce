const db = require('../database');

// Função para buscar todas as avaliações de um produto
const findByProductId = async (produtoId) => {
    const { rows } = await db.query(`
        SELECT a.id, a.nota, a.comentario, a.criado_em, c.nome AS cliente_nome
        FROM avaliacoes a
        JOIN clientes c ON a.cliente_id = c.id
        WHERE a.produto_id = $1
        ORDER BY a.criado_em DESC
    `, [produtoId]);
    return rows;
};

// Função para criar uma nova avaliação
const create = async ({ produto_id, cliente_id, nota, comentario }) => {
    const { rows } = await db.query(
        'INSERT INTO avaliacoes (produto_id, cliente_id, nota, comentario) VALUES ($1, $2, $3, $4) RETURNING *',
        [produto_id, cliente_id, nota, comentario]
    );
    return rows[0];
};

module.exports = {
    findByProductId,
    create,
};