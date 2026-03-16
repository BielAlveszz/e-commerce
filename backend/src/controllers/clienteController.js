const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { z } = require('zod'); // Biblioteca de validação
const ClienteModel = require('../models/clienteModel');

const JWT_SECRET = process.env.JWT_SECRET;

// ESQUEMAS DE VALIDAÇÃO ZOD
const registroSchema = z.object({
    nome: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
    email: z.string().email("Formato de e-mail inválido"),
    senha: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
    telefone: z.string().optional(),
    cpf: z.string().length(11, "O CPF deve conter exatos 11 dígitos numéricos")
});

// Controller para registrar um novo cliente
const registrarCliente = async (req, res, next) => {
    try {
        // Valida os dados da requisição com o Zod antes de ir para o banco
        const dadosValidados = registroSchema.parse(req.body);

        const novoCliente = await ClienteModel.create(dadosValidados);
        res.status(201).json({ message: 'Cliente registrado com sucesso!', cliente: novoCliente });
    } catch (error) {
        // Se o erro for de validação do Zod, retorna erro 400 com os detalhes
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: 'Dados inválidos', erros: error.errors });
        }
        // Tratamento de erro de banco de dados (ex: CPF ou Email duplicado)
        if (error.code === '23505') { 
            return res.status(400).json({ message: 'Este email ou CPF já está em uso.' });
        }
        // Repassa outros erros (ex: banco fora do ar) para o middleware de erro global
        if (next) return next(error);
        res.status(500).json({ message: 'Erro ao registrar cliente.' });
    }
};

// Controller para fazer login
const loginCliente = async (req, res, next) => {
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

        // Criamos o token APENAS com id e is_admin (sem CPF para evitar vazamento)
        const token = jwt.sign(
            { 
                id: cliente.id, 
                is_admin: cliente.is_admin 
            },
            JWT_SECRET,
            { expiresIn: '2h' }
        );

        // Retornamos o is_admin no objeto 'user' para o React armazenar no AuthContext
        res.json({
            message: 'Login bem-sucedido!',
            token: token,
            user: { 
                id: cliente.id, 
                nome: cliente.nome, 
                email: cliente.email,
                is_admin: cliente.is_admin
            } 
        });
    } catch (error) {
        if (next) return next(error);
        res.status(500).json({ message: 'Erro ao fazer login.' });
    }
};

module.exports = {
    registrarCliente,
    loginCliente,
};