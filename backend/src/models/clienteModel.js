const db = require('../database');
const bcrypt = require('bcryptjs');
const { encrypt } = require('../utils/crypto'); 

const findByEmail = async (email) => {
    const { rows } = await db.query('SELECT * FROM clientes WHERE email = $1', [email]);
    return rows[0];
};

const create = async ({ nome, email, senha, telefone, cpf }) => {
    const salt = await bcrypt.genSalt(12);
    const senhaHash = await bcrypt.hash(senha, salt);

    // Encripta o CPF antes de o enviar para a base de dados (Proteção LGPD)
    const cpfEncriptado = encrypt(cpf);

    // Adicionamos o NOW() no final para registrar o momento exato do aceite dos Termos
    const { rows } = await db.query(
        'INSERT INTO clientes (nome, email, senha_hash, telefone, cpf, termos_aceitos_em) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id, nome, email',
        [nome, email, senhaHash, telefone, cpfEncriptado]
    );
    return rows[0];
};

module.exports = {
    findByEmail,
    create,
};