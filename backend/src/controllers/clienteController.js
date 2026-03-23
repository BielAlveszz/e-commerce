const jwt    = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { z }  = require('zod');
const ClienteModel  = require('../models/clienteModel');
const CarrinhoModel = require('../models/carrinhoModel');

const JWT_SECRET    = process.env.JWT_SECRET;
const NODE_ENV      = process.env.NODE_ENV || 'development';
const isProd        = NODE_ENV === 'production';

// Configuração do cookie — mesmos valores usados em login e logout
const cookieOptions = {
    httpOnly: true,                              // JavaScript nunca consegue ler
    secure:   isProd,                            // HTTPS obrigatório só em produção
    sameSite: isProd ? 'none' : 'lax',           // 'none' para domínios cruzados em prod, 'lax' em dev
    maxAge:   2 * 60 * 60 * 1000,               // 2 horas em milissegundos
    path:     '/',
};

const registroSchema = z.object({
    nome:     z.string().min(3, 'O nome deve ter pelo menos 3 caracteres'),
    email:    z.string().email('Formato de e-mail inválido'),
    senha:    z.string()
                .min(8, 'A senha deve ter pelo menos 8 caracteres')
                .regex(/[A-Z]/, 'A senha deve conter pelo menos uma letra maiúscula')
                .regex(/[a-z]/, 'A senha deve conter pelo menos uma letra minúscula')
                .regex(/\d/,    'A senha deve conter pelo menos um número'),
    telefone: z.string().optional(),
    cpf:      z.string().length(11, 'O CPF deve conter exatos 11 dígitos numéricos'),
});

// POST /api/clientes/registrar
const registrarCliente = async (req, res, next) => {
    try {
        const dadosValidados = registroSchema.parse(req.body);
        const novoCliente    = await ClienteModel.create(dadosValidados);
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
            return res.status(401).json({ message: 'Email ou senha inválidos.' });
        }

        const senhaCorreta = await bcrypt.compare(senha, cliente.senha_hash);
        if (!senhaCorreta) {
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
                id:       cliente.id,
                nome:     cliente.nome,
                email:    cliente.email,
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

// GET /api/clientes/me — verifica se o cookie é válido e retorna dados do usuário
const getMe = async (req, res) => {
    try {
        const { rows } = await require('../database').query(
            'SELECT id, nome, email, is_admin FROM clientes WHERE id = $1',
            [req.user.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        res.json({ user: rows[0] });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar dados do usuário.' });
    }
};

module.exports = {
    registrarCliente,
    loginCliente,
    logoutCliente,
    getMe,
};