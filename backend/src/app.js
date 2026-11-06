require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const path       = require('path');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const logger     = require('./utils/logger'); // <-- Importação do Logger
const csrfMiddleware = require('./middleware/csrfMiddleware'); // <-- Importação do Anti-CSRF

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
const enderecoRoutes = require('./routes/enderecoRoutes')

const app = express();

app.set('trust proxy', 1);
app.use((req, res, next) => {
    if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
        return res.redirect(301, 'https://' + req.headers.host + req.url);
    }
    next();
});

app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }));

const corsOptions = {
    origin:      process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use('/images', express.static(path.join(__dirname, '../public/images')));

// APLICAR PROTEÇÃO CSRF GLOBALMENTE
app.use(csrfMiddleware);

// Logar todas as requisições recebidas (opcional, bom para auditoria)
app.use((req, res, next) => {
    logger.info(`Entrada: ${req.method} ${req.originalUrl}`);
    next();
});

const ehProd = process.env.NODE_ENV === 'production';

// Limitador geral da API: generoso em produção, praticamente livre em desenvolvimento.
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max:      ehProd ? 1000 : 100000,
    standardHeaders: true,
    legacyHeaders:   false,
    message:  { message: 'Muitas requisições deste IP, tente novamente em 15 minutos.' }
});

// Limitador só para rotas sensíveis de autenticação (login, registro, reset de senha).
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max:      ehProd ? 20 : 1000,
    standardHeaders: true,
    legacyHeaders:   false,
    message:  { message: 'Muitas tentativas de autenticação, tente novamente mais tarde.' }
});

app.use('/api/', apiLimiter);

app.use('/api/produtos',    productRoutes);
app.use('/api/pedidos',     orderRoutes);
app.use('/api/clientes',    authLimiter, clienteRoutes);
app.use('/api/categorias',  categoryRoutes);
app.use('/api/upload',      uploadRoutes);
app.use('/api/avaliacoes',  reviewRoutes);
app.use('/api/webhook',     webhookRoutes);
app.use('/api/dashboard',   dashboardRoutes);
app.use('/api/carrinho',    carrinhoRoutes);
app.use('/api/enderecos',   enderecoRoutes);
app.use('/api/cupons',      cupomRoutes);


// MIDDLEWARE GLOBAL DE ERROS (AGORA USANDO WINSTON)
app.use((err, req, res, next) => {
    // Grava o stack trace completo no ficheiro error.log
    logger.error(`Erro na rota ${req.method} ${req.originalUrl}`, err);
    
    const isProd = process.env.NODE_ENV === 'production';
    res.status(500).json({
        message: 'Erro interno do servidor!',
        ...(isProd ? {} : { detalhes: err.message })
    });
});

module.exports = app;