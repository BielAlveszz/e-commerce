const jwt = require('jsonwebtoken');
const JWT_SECRET = 'meby-cosmeticos-chave-secreta-2025'; // A mesma chave secreta do clienteRoutes

const authMiddleware = (req, res, next) => {
  // O token geralmente é enviado no cabeçalho "Authorization" no formato "Bearer TOKEN"
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Acesso negado. Nenhum token fornecido.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verifica se o token é válido
    const decoded = jwt.verify(token, JWT_SECRET);
    // Adiciona as informações do usuário (que estavam no token) na requisição
    req.user = decoded; 
    next(); // Permite que a requisição continue para a rota principal
  } catch (error) {
    res.status(401).json({ message: 'Token inválido.' });
  }
};

module.exports = authMiddleware;