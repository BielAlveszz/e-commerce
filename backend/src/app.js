const express = require('express');
const cors = require('cors');

// Importando os arquivos que definem as rotas da nossa API
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const clienteRoutes = require('./routes/clienteRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Rotas principais da API
// A CORREÇÃO ESTÁ AQUI: Trocamos '/api/products' por '/api/produtos'
app.use('/api/produtos', productRoutes); 
app.use('/api/pedidos', orderRoutes);
app.use('/api/clientes', clienteRoutes);

module.exports = app;