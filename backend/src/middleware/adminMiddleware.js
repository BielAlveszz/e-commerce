const jwt = require('jsonwebtoken');
const db = require('../database');

// CORREÇÃO: Garante que estamos usando a variável de ambiente
const JWT_SECRET = process.env.JWT_SECRET;

const adminMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Acesso negado.' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { rows } = await db.query('SELECT is_admin FROM clientes WHERE id = $1', [decoded.id]);
    if (rows.length === 0 || !rows[0].is_admin) {
      return res.status(403).json({ message: 'Acesso proibido. Rota apenas para administradores.' });
    }
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token inválido.' });
  }
};

module.exports = adminMiddleware;