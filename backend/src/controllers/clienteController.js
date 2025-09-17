const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const ClienteModel = require('../models/clienteModel');

const JWT_SECRET = process.env.JWT_SECRET;

// Controller para registrar um novo cliente
const registrarCliente = async (req, res) => {
    const { nome, email, senha, telefone, cpf } = req.body;
    if (!nome || !email || !senha || !cpf) {
        return res.status(400).json({ message: 'Nome, email, senha e CPF são obrigatórios.' });
    }

    try {
        const novoCliente = await ClienteModel.create({ nome, email, senha, telefone, cpf });
        res.status(201).json({ message: 'Cliente registrado com sucesso!', cliente: novoCliente });
    } catch (error) {
        if (error.code === '23505') { 
            return res.status(400).json({ message: 'Este email ou CPF já está em uso.' });
        }
        res.status(500).json({ message: 'Erro ao registrar cliente.' });
    }
};

// Controller para fazer login
const loginCliente = async (req, res) => {
    const { email, senha } = req.body;
    if (!email || !senha) {
        return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
    }

    try {
        const cliente = await ClienteModel.findByEmail(email);
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
        });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao fazer login.' });
    }
};

module.exports = {
    registrarCliente,
    loginCliente,
};