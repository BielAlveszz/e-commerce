require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const clienteRoutes = require('./routes/clienteRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const webhookRoutes = require('./routes/webhookRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/images', express.static(path.join(__dirname, '../public/images')));

// Rotas principais da API
app.use('/api/produtos', productRoutes); 
app.use('/api/pedidos', orderRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/categorias', categoryRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/avaliacoes', reviewRoutes);
app.use('/api/webhook', webhookRoutes);

module.exports = app;
