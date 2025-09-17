const db = require('../database');
const bcrypt = require('bcryptjs');

// Função para encontrar um cliente pelo email
const findByEmail = async (email) => {
    const { rows } = await db.query('SELECT * FROM clientes WHERE email = $1', [email]);
    return rows[0];
};

// Função para criar um novo cliente
const create = async ({ nome, email, senha, telefone, cpf }) => {
    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(senha, salt);

    const { rows } = await db.query(
        'INSERT INTO clientes (nome, email, senha_hash, telefone, cpf) VALUES ($1, $2, $3, $4, $5) RETURNING id, nome, email',
        [nome, email, senhaHash, telefone, cpf]
    );
    return rows[0];
};

module.exports = {
    findByEmail,
    create,
};