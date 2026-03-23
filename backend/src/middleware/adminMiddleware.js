const jwt = require('jsonwebtoken');
const db  = require('../database');

const JWT_SECRET = process.env.JWT_SECRET;

const adminMiddleware = async (req, res, next) => {
    // Lê o token do httpOnly cookie
    const token = req.cookies?.token;

    if (!token) {
        return res.status(401).json({ message: 'Acesso negado.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // Confirma no banco se o usuário ainda é admin
        const { rows } = await db.query(
            'SELECT is_admin FROM clientes WHERE id = $1',
            [decoded.id]
        );

        if (rows.length === 0 || !rows[0].is_admin) {
            return res.status(403).json({ message: 'Acesso proibido. Rota apenas para administradores.' });
        }

        req.user = decoded;
        next();
    } catch (error) {
        res.clearCookie('token', { httpOnly: true, path: '/' });
        return res.status(401).json({ message: 'Sessão expirada. Faça o login novamente.' });
    }
};

module.exports = adminMiddleware;