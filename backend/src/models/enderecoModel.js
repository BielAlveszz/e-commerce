const db = require('../database');

const findByCliente = async (clienteId) => {
    const { rows } = await db.query(
        'SELECT * FROM enderecos WHERE cliente_id = $1 ORDER BY principal DESC, criado_em DESC',
        [clienteId]
    );
    return rows;
};

const create = async (clienteId, dados) => {
    const { rows: qtd } = await db.query('SELECT COUNT(*) FROM enderecos WHERE cliente_id = $1', [clienteId]);
    const isPrincipal = parseInt(qtd[0].count) === 0 ? true : (dados.principal || false);

    const { rows } = await db.query(
        `INSERT INTO enderecos (cliente_id, apelido, tipo_entrega, descricao_local, principal)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
            clienteId, 
            dados.apelido || 'Meu Local', 
            dados.tipo_entrega, 
            dados.descricao_local, 
            isPrincipal
        ]
    );
    return rows[0];
};

const updatePrincipal = async (clienteId, enderecoId) => {
    const { rows } = await db.query(
        'UPDATE enderecos SET principal = TRUE WHERE id = $1 AND cliente_id = $2 RETURNING *',
        [enderecoId, clienteId]
    );
    return rows[0];
};

const remove = async (clienteId, enderecoId) => {
    const { rowCount } = await db.query(
        'DELETE FROM enderecos WHERE id = $1 AND cliente_id = $2',
        [enderecoId, clienteId]
    );
    return rowCount;
};

module.exports = {
    findByCliente,
    create,
    updatePrincipal,
    remove
};