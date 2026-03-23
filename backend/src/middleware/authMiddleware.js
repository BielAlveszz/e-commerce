const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

const authMiddleware = (req, res, next) => {
    // Lê o token do httpOnly cookie (não mais do header Authorization)
    const token = req.cookies?.token;

    if (!token) {
        return res.status(401).json({ message: 'Acesso negado. Faça o login.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        // Token expirado ou inválido — limpa o cookie corrompido
        res.clearCookie('token', { httpOnly: true, path: '/' });
        return res.status(401).json({ message: 'Sessão expirada. Faça o login novamente.' });
    }
};

module.exports = authMiddleware;