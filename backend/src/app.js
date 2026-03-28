require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const path       = require('path');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const cookieParser = require('cookie-parser');

const productRoutes  = require('./routes/productRoutes');
const orderRoutes    = require('./routes/orderRoutes');
const clienteRoutes  = require('./routes/clienteRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const uploadRoutes   = require('./routes/uploadRoutes');
const reviewRoutes   = require('./routes/reviewRoutes');
const webhookRoutes  = require('./routes/webhookRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const carrinhoRoutes = require('./routes/carrinhoRoutes');
const cupomRoutes    = require('./routes/cupomRoutes');

const app = express();

// 1. HTTPS forçado em produção
// Railway e outros provedores enviam o header x-forwarded-proto
app.set('trust proxy', 1);
app.use((req, res, next) => {
    if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
        return res.redirect(301, 'https://' + req.headers.host + req.url);
    }
    next();
});

// 2. HELMET — headers de segurança HTTP
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }));

// 2. CORS — aceita credenciais (cookies) e só permite o frontend autorizado
const corsOptions = {
    origin:      process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,   // obrigatório para cookies funcionarem entre origens
    optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// 3. COOKIE PARSER — necessário para ler req.cookies
app.use(cookieParser());

app.use(express.json());
app.use('/images', express.static(path.join(__dirname, '../public/images')));

// 4. RATE LIMITING
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max:      100,
    message:  { message: 'Muitas requisições deste IP, tente novamente em 15 minutos.' }
});

const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    // Em produção: 10 tentativas/hora. Em desenvolvimento: 100 para não travar testes
    max:      process.env.NODE_ENV === 'production' ? 10 : 100,
    message:  { message: 'Muitas tentativas de autenticação, tente novamente mais tarde.' }
});

app.use('/api/', apiLimiter);

// Rotas
app.use('/api/produtos',    productRoutes);
app.use('/api/pedidos',     orderRoutes);
app.use('/api/clientes',    authLimiter, clienteRoutes);
app.use('/api/categorias',  categoryRoutes);
app.use('/api/upload',      uploadRoutes);
app.use('/api/avaliacoes',  reviewRoutes);
app.use('/api/webhook',     webhookRoutes);
app.use('/api/dashboard',   dashboardRoutes);
app.use('/api/carrinho',    carrinhoRoutes);
app.use('/api/cupons',      cupomRoutes);

// 5. MIDDLEWARE GLOBAL DE ERROS
app.use((err, req, res, next) => {
    console.error(err.stack);
    const isProd = process.env.NODE_ENV === 'production';
    res.status(500).json({
        message: 'Erro interno do servidor!',
        ...(isProd ? {} : { detalhes: err.message })
    });
});

module.exports = app;