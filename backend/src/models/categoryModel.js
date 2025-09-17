const db = require('../database');

const findAll = async () => {
    const { rows } = await db.query('SELECT * FROM "categorias" ORDER BY nome ASC');
    return rows;
};

const create = async (nome) => {
    const { rows } = await db.query('INSERT INTO "categorias" (nome) VALUES ($1) RETURNING *', [nome]);
    return rows[0];
};

const update = async (id, nome) => {
    const { rows } = await db.query('UPDATE "categorias" SET nome = $1 WHERE id = $2 RETURNING *', [nome, id]);
    return rows[0];
};

const remove = async (id) => {
    await db.query('DELETE FROM "categorias" WHERE id = $1', [id]);
};

// Sub-categorias
const findAllSub = async (categoriaId) => {
    let query = 'SELECT * FROM "sub_categorias"';
    const params = [];
    if (categoriaId) {
        query += ' WHERE categoria_id = $1';
        params.push(categoriaId);
    }
    query += ' ORDER BY nome ASC';
    const { rows } = await db.query(query, params);
    return rows;
};

const createSub = async (nome, categoria_id) => {
    const { rows } = await db.query(
        'INSERT INTO "sub_categorias" (nome, categoria_id) VALUES ($1, $2) RETURNING *',
        [nome, categoria_id]
    );
    return rows[0];
};

const removeSub = async (id) => {
    await db.query('DELETE FROM "sub_categorias" WHERE id = $1', [id]);
};

module.exports = {
    findAll, create, update, remove,
    findAllSub, createSub, removeSub
};