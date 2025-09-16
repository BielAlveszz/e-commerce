const express = require('express');
const router = express.Router();
const db = require('../database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// CORREÇÃO: Garante que estamos usando a variável de ambiente
const JWT_SECRET = process.env.JWT_SECRET;

// ROTA: Registrar um novo cliente (COM CPF)
router.post('/registrar', async (req, res) => {
    const { nome, email, senha, telefone, cpf } = req.body;
    if (!nome || !email || !senha || !cpf) {
        return res.status(400).json({ message: 'Nome, email, senha e CPF são obrigatórios.' });
    }
    try {
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(senha, salt);
        const { rows } = await db.query(
            'INSERT INTO clientes (nome, email, senha_hash, telefone, cpf) VALUES ($1, $2, $3, $4, $5) RETURNING id, nome, email',
            [nome, email, senhaHash, telefone, cpf]
        );
        res.status(201).json({ message: 'Cliente registrado com sucesso!', cliente: rows[0] });
    } catch (error) {
        if (error.code === '23505') { 
            return res.status(400).json({ message: 'Este email ou CPF já está em uso.' });
        }
        res.status(500).json({ message: 'Erro ao registrar cliente.' });
    }
});

// ROTA: Fazer login
router.post('/login', async (req, res) => {
    const { email, senha } = req.body;
    if (!email || !senha) {
        return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
    }
    try {
        const { rows } = await db.query('SELECT * FROM clientes WHERE email = $1', [email]);
        const cliente = rows[0];
        if (!cliente) {
            return res.status(401).json({ message: 'Email ou senha inválidos.' });
        }
        const senhaCorreta = await bcrypt.compare(senha, cliente.senha_hash);
        if (!senhaCorreta) {
            return res.status(401).json({ message: 'Email ou senha inválidos.' });
        }

        const token = jwt.sign(
            { id: cliente.id, nome: cliente.nome, email: cliente.email, cpf: cliente.cpf },
            JWT_SECRET,
            { expiresIn: '1h' }
        );
        res.json({
            message: 'Login bem-sucedido!',
            token: token,
            cliente: { id: cliente.id, nome: cliente.nome, email: cliente.email }
        });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao fazer login.' });
    }
});

module.exports = router;