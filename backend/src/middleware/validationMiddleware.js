const xss = require('xss'); // <-- Adicionada a biblioteca de sanitização

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

const validateProductData = (data) => {
  const errors = [];
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push('Nome do produto é obrigatório e deve ser uma string válida');
  }
  if (!data.price || typeof data.price !== 'number' || data.price <= 0) {
    errors.push('Preço deve ser um número positivo');
  }
  if (!data.category || typeof data.category !== 'string' || data.category.trim().length === 0) {
    errors.push('Categoria é obrigatória');
  }
  if (data.description && typeof data.description !== 'string') {
    errors.push('Descrição deve ser uma string');
  }
  if (data.stock !== undefined && (typeof data.stock !== 'number' || data.stock < 0)) {
    errors.push('Estoque deve ser um número não-negativo');
  }
  return errors;
};

const validateOrderData = (data) => {
  const errors = [];
  if (!data.userId || typeof data.userId !== 'number') {
    errors.push('ID do usuário é obrigatório');
  }
  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    errors.push('Pedido deve conter pelo menos um item');
  }
  if (data.items && Array.isArray(data.items)) {
    data.items.forEach((item, index) => {
      if (!item.productId || typeof item.productId !== 'number') {
        errors.push(`Item ${index + 1}: ID do produto é obrigatório`);
      }
      if (!item.quantity || typeof item.quantity !== 'number' || item.quantity <= 0) {
        errors.push(`Item ${index + 1}: Quantidade deve ser um número positivo`);
      }
    });
  }
  if (!data.shippingAddress || typeof data.shippingAddress !== 'string') {
    errors.push('Endereço de entrega é obrigatório');
  }
  return errors;
};

const validateClientData = (data) => {
  const errors = [];
  if (!data.nome || typeof data.nome !== 'string' || data.nome.trim().length === 0) {
    errors.push('Nome é obrigatório');
  }
  if (!data.email || !validateEmail(data.email)) {
    errors.push('Email inválido');
  }
  if (data.senha && !validatePassword(data.senha)) {
    errors.push('Senha deve ter pelo menos 8 caracteres, incluindo maiúsculas, minúsculas e números');
  }
  if (data.telefone && !/^\d{10,11}$/.test(data.telefone.replace(/\D/g, ''))) {
    errors.push('Telefone inválido');
  }
  return errors;
};

const validateMercadoPagoData = (data) => {
  const errors = [];
  if (!data.orderId || typeof data.orderId !== 'number') {
    errors.push('ID do pedido é obrigatório');
  }
  if (!data.amount || typeof data.amount !== 'number' || data.amount <= 0) {
    errors.push('Valor deve ser um número positivo');
  }
  if (!data.paymentMethodId || typeof data.paymentMethodId !== 'string') {
    errors.push('Método de pagamento é obrigatório');
  }
  return errors;
};

const validateProduct = (req, res, next) => {
  const errors = validateProductData(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: 'Dados inválidos', errors: errors });
  }
  next();
};

const validateOrder = (req, res, next) => {
  const errors = validateOrderData(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: 'Dados do pedido inválidos', errors: errors });
  }
  next();
};

const validateClient = (req, res, next) => {
  const errors = validateClientData(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: 'Dados do cliente inválidos', errors: errors });
  }
  next();
};

const validateMercadoPago = (req, res, next) => {
  const errors = validateMercadoPagoData(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: 'Dados de pagamento inválidos', errors: errors });
  }
  next();
};

/**
 * Middleware para sanitizar entrada e prevenir XSS de forma PROFISSIONAL
 */
const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      // Usa a biblioteca xss para limpar strings (bloqueia scripts <script>, onload=, javascript:, etc)
      return xss(obj.trim());
    }
    if (typeof obj === 'object' && obj !== null) {
      Object.keys(obj).forEach((key) => {
        obj[key] = sanitize(obj[key]);
      });
    }
    return obj;
  };

  req.body = sanitize(req.body);
  req.query = sanitize(req.query);
  req.params = sanitize(req.params);

  next();
};

const errorHandler = (err, req, res, next) => {
  console.error('Erro:', err);
  if (err.name === 'ValidationError') {
    return res.status(400).json({ success: false, message: 'Erro de validação', errors: err.details || err.message });
  }
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ success: false, message: 'Não autorizado' });
  }
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ success: false, message: 'Registro duplicado' });
  }
  res.status(err.status || 500).json({ success: false, message: err.message || 'Erro interno do servidor' });
};

module.exports = {
  validateEmail,
  validatePassword,
  validateProductData,
  validateOrderData,
  validateClientData,
  validateMercadoPagoData,
  validateProduct,
  validateOrder,
  validateClient,
  validateMercadoPago,
  sanitizeInput,
  errorHandler,
};