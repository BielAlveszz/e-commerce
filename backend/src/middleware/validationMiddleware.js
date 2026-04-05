// ─────────────────────────────────────────────────────────────────
// validationMiddleware.js
//
// IMPORTANTE: a validação de produto foi migrada para Zod direto
// no productController.js, que é a fonte de verdade para o schema.
// O `validateProduct` antigo verificava campos errados (name, price,
// category) que não batem com os campos reais do banco (nome, preco,
// sub_categoria_id), então foi removido para evitar falsos positivos.
//
// Este arquivo mantém:
//  - sanitizeInput  — higieniza strings do req.body/query/params
//  - helpers de validação reutilizáveis (email, password)
//  - errorHandler   — middleware global de erros
// ─────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────
// Sanitização contra XSS — converte caracteres perigosos em entidades HTML.
// Aplicada como middleware em todas as rotas de leitura e escrita.
// ─────────────────────────────────────────────────────────────────
const sanitizeString = (str) => {
    return str
        .replace(/&/g,  '&amp;')
        .replace(/</g,  '&lt;')
        .replace(/>/g,  '&gt;')
        .replace(/"/g,  '&quot;')
        .replace(/'/g,  '&#x27;')
        .replace(/\//g, '&#x2F;');
};

// ─────────────────────────────────────────────────────────────────
// sanitizeInput — middleware que percorre body, query e params
// sanitizando recursivamente todas as strings.
// Não toca em números, booleans ou null.
// ─────────────────────────────────────────────────────────────────
const sanitizeInput = (req, res, next) => {
    const sanitize = (obj) => {
        if (typeof obj === 'string') return sanitizeString(obj.trim());
        if (Array.isArray(obj))     return obj.map(sanitize);
        if (typeof obj === 'object' && obj !== null) {
            return Object.fromEntries(
                Object.entries(obj).map(([k, v]) => [k, sanitize(v)])
            );
        }
        return obj; // number, boolean, null — passa sem alteração
    };

    req.body   = sanitize(req.body);
    req.query  = sanitize(req.query);
    req.params = sanitize(req.params);

    next();
};

// ─────────────────────────────────────────────────────────────────
// Helpers reutilizáveis (usados em testes ou outros middlewares)
// ─────────────────────────────────────────────────────────────────
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const validatePassword = (password) => {
    // Mínimo 8 chars, uma maiúscula, uma minúscula, um número
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return passwordRegex.test(password);
};

// ─────────────────────────────────────────────────────────────────
// errorHandler — middleware global de erros (registrado no app.js)
// Captura erros não tratados e retorna resposta padronizada.
// ─────────────────────────────────────────────────────────────────
const errorHandler = (err, req, res, next) => {
    console.error('Erro não tratado:', err);

    // Erros de validação Zod (lançados manualmente com .parse)
    if (err.name === 'ZodError') {
        return res.status(400).json({
            message: 'Dados inválidos.',
            erros: err.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        });
    }

    // Erros de autenticação JWT
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Sessão inválida ou expirada.' });
    }

    // Violação de chave única no Postgres
    if (err.code === '23505') {
        return res.status(409).json({ message: 'Registro duplicado.' });
    }

    // Violação de FK no Postgres
    if (err.code === '23503') {
        return res.status(400).json({ message: 'Referência inválida. Verifique os dados informados.' });
    }

    const isProd = process.env.NODE_ENV === 'production';
    res.status(err.status || 500).json({
        message: isProd ? 'Erro interno do servidor.' : (err.message || 'Erro interno do servidor.'),
        ...(isProd ? {} : { stack: err.stack }),
    });
};

module.exports = {
    sanitizeInput,
    validateEmail,
    validatePassword,
    errorHandler,
};