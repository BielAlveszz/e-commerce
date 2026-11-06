const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const ClienteModel = require('../models/clienteModel');
const CarrinhoModel = require('../models/carrinhoModel');
const db = require('../database');
const logger = require('../utils/logger');
const { decrypt } = require('../utils/crypto');

const JWT_SECRET = process.env.JWT_SECRET;
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProd = NODE_ENV === 'production';

// Configuração do cookie — mesmos valores usados em login e logout
const cookieOptions = {
    httpOnly: true,                              // JavaScript nunca consegue ler
    secure: isProd,                            // HTTPS obrigatório só em produção
    sameSite: isProd ? 'none' : 'lax',           // 'none' para domínios cruzados em prod, 'lax' em dev
    maxAge: 2 * 60 * 60 * 1000,               // 2 horas em milissegundos
    path: '/',
};

const registroSchema = z.object({
    nome: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres'),
    email: z.string().email('Formato de e-mail inválido'),
    senha: z.string()
        .min(8, 'A senha deve ter pelo menos 8 caracteres')
        .regex(/[A-Z]/, 'A senha deve conter pelo menos uma letra maiúscula')
        .regex(/[a-z]/, 'A senha deve conter pelo menos uma letra minúscula')
        .regex(/\d/, 'A senha deve conter pelo menos um número'),
    telefone: z.string().optional(),
    cpf: z.string().length(11, 'O CPF deve conter exatos 11 dígitos numéricos'),

    // NOVO: Validação estrita obrigando o aceite dos termos
    aceitouTermos: z.literal(true, {
        errorMap: () => ({ message: 'Você deve ler e aceitar os Termos de Uso e a Política de Privacidade para se cadastrar.' })
    })
});

const atualizarPerfilSchema = z.object({
    nome: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres'),
    email: z.string().email('Formato de e-mail inválido'),
    telefone: z.string().optional().nullable(),
});

const trocarSenhaSchema = z.object({
    senhaAtual: z.string().min(1, 'Senha atual é obrigatória'),
    novaSenha: z.string()
        .min(8, 'A nova senha deve ter pelo menos 8 caracteres')
        .regex(/[A-Z]/, 'A nova senha deve conter pelo menos uma letra maiúscula')
        .regex(/[a-z]/, 'A nova senha deve conter pelo menos uma letra minúscula')
        .regex(/\d/, 'A nova senha deve conter pelo menos um número'),
});

// POST /api/clientes/registrar
const registrarCliente = async (req, res, next) => {
    try {
        const dadosValidados = registroSchema.parse(req.body);
        const novoCliente = await ClienteModel.create(dadosValidados);
        res.status(201).json({ message: 'Cliente registrado com sucesso!', cliente: novoCliente });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: 'Dados inválidos', erros: error.errors });
        }
        if (error.code === '23505') {
            return res.status(400).json({ message: 'Este email ou CPF já está em uso.' });
        }
        next(error);
    }
};

// POST /api/clientes/login
const loginCliente = async (req, res, next) => {
    const { email, senha, cartItems } = req.body;

    if (!email || !senha) {
        return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
    }

    try {
        const cliente = await ClienteModel.findByEmail(email);
        if (!cliente) {
            logger.warn(`Tentativa de login falhada. Email inexistente: ${email} | IP: ${req.ip}`); // <-- LOG
            return res.status(401).json({ message: 'Email ou senha inválidos.' });
        }

        const senhaCorreta = await bcrypt.compare(senha, cliente.senha_hash);
        if (!senhaCorreta) {
            logger.warn(`Tentativa de login falhada. Palavra-passe incorreta: ${email} | IP: ${req.ip}`); // <-- LOG
            return res.status(401).json({ message: 'Email ou senha inválidos.' });
        }

        // Se o cliente tinha itens no carrinho anônimo, faz o merge
        if (Array.isArray(cartItems) && cartItems.length > 0) {
            await CarrinhoModel.mergeCart(cliente.id, cartItems);
        }

        const token = jwt.sign(
            { id: cliente.id, is_admin: cliente.is_admin },
            JWT_SECRET,
            { expiresIn: '2h' }
        );

        // Seta o token num httpOnly cookie — JavaScript nunca consegue lê-lo
        res.cookie('token', token, cookieOptions);

        // Retorna apenas os dados do usuário (sem o token no JSON)
        res.json({
            message: 'Login bem-sucedido!',
            user: {
                id: cliente.id,
                nome: cliente.nome,
                email: cliente.email,
                is_admin: cliente.is_admin,
            }
        });
    } catch (error) {
        next(error);
    }
};

// POST /api/clientes/logout
const logoutCliente = (req, res) => {
    res.clearCookie('token', { ...cookieOptions, maxAge: 0 });
    res.json({ message: 'Logout realizado com sucesso.' });
};

// GET /api/clientes/me — retorna dados completos do usuário autenticado
const getMe = async (req, res) => {
    try {
        const { rows } = await db.query(
            'SELECT id, nome, email, telefone, cpf, is_admin, criado_em FROM clientes WHERE id = $1',
            [req.user.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        const user = rows[0];
        // Desencriptamos o CPF para o ecrã do utilizador mostrar a informação corretamente
        if (user.cpf) {
            user.cpf = decrypt(user.cpf);
        }

        res.json({ user });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar dados do usuário.' });
    }
};

// PUT /api/clientes/me — atualiza perfil do cliente autenticado (nome, email, telefone)
const atualizarPerfil = async (req, res, next) => {
    try {
        const dadosValidados = atualizarPerfilSchema.parse(req.body);

        // Verifica se o novo email já pertence a outro cliente
        if (dadosValidados.email) {
            const { rows: emailCheck } = await db.query(
                'SELECT id FROM clientes WHERE email = $1 AND id != $2',
                [dadosValidados.email, req.user.id]
            );
            if (emailCheck.length > 0) {
                return res.status(400).json({ message: 'Este email já está em uso por outro usuário.' });
            }
        }

        const { rows } = await db.query(
            `UPDATE clientes
             SET nome = $1, email = $2, telefone = $3
             WHERE id = $4
             RETURNING id, nome, email, telefone, cpf, is_admin`,
            [dadosValidados.nome, dadosValidados.email, dadosValidados.telefone || null, req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        res.json({ message: 'Perfil atualizado com sucesso!', user: rows[0] });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: 'Dados inválidos', erros: error.errors });
        }
        if (error.code === '23505') {
            return res.status(400).json({ message: 'Este email já está em uso.' });
        }
        next(error);
    }
};

// PUT /api/clientes/me/senha — troca a senha do cliente autenticado
const trocarSenha = async (req, res, next) => {
    try {
        const { senhaAtual, novaSenha } = trocarSenhaSchema.parse(req.body);

        const { rows } = await db.query(
            'SELECT senha_hash FROM clientes WHERE id = $1',
            [req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        const senhaCorreta = await bcrypt.compare(senhaAtual, rows[0].senha_hash);
        if (!senhaCorreta) {
            return res.status(401).json({ message: 'Senha atual incorreta.' });
        }

        if (senhaAtual === novaSenha) {
            return res.status(400).json({ message: 'A nova senha deve ser diferente da senha atual.' });
        }

        const salt = await bcrypt.genSalt(12);
        const hash = await bcrypt.hash(novaSenha, salt);

        await db.query(
            'UPDATE clientes SET senha_hash = $1 WHERE id = $2',
            [hash, req.user.id]
        );

        res.json({ message: 'Senha alterada com sucesso!' });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: 'Dados inválidos', erros: error.errors });
        }
        next(error);
    }
};

module.exports = {
    registrarCliente,
    loginCliente,
    logoutCliente,
    getMe,
    atualizarPerfil,
    trocarSenha,
};