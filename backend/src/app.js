require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet'); // Nova importação de segurança
const rateLimit = require('express-rate-limit'); // Nova importação contra força bruta

const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const clienteRoutes = require('./routes/clienteRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes')

const app = express();

// 1. HELMET: Protege a aplicação configurando vários cabeçalhos HTTP
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" })); // Permite carregar imagens corretamente

// 2. CORS RESTRITO: Permite requisições apenas do seu frontend
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173', // Altere para a URL oficial em produção
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());
app.use('/images', express.static(path.join(__dirname, '../public/images')));

// 3. RATE LIMITING: Limita a quantidade de requisições por IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Limite de 100 requisições por IP
  message: { message: 'Muitas requisições deste IP, tente novamente em 15 minutos.' }
});

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // Limite de 10 tentativas de login/registro por hora
  message: { message: 'Muitas tentativas de autenticação, tente novamente mais tarde.' }
});

// Aplica limite geral em toda a API
app.use('/api/', apiLimiter);

// Rotas principais da API
app.use('/api/produtos', productRoutes); 
app.use('/api/pedidos', orderRoutes);
app.use('/api/clientes', authLimiter, clienteRoutes); // Aplica o limite rigoroso na rota de clientes
app.use('/api/categorias', categoryRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/avaliacoes', reviewRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 4. MIDDLEWARE GLOBAL DE ERROS: Padroniza as respostas de erro
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Erro interno do servidor!', detalhes: err.message });
});

module.exports = app;