const express = require('express');
const router = express.Router();
const db = require('../database');
const { v4: uuidv4 } = require('uuid');

// ROTA para criar um novo pedido
// ENDEREÇO: POST http://localhost:3001/api/orders
router.post('/', async (req, res) => {
  const { cartItems } = req.body;

  if (!cartItems || cartItems.length === 0) {
    return res.status(400).json({ message: "O carrinho está vazio!" });
  }
  
  try {
    // 1. Validar estoque e calcular o total
    let totalAmount = 0;
    for (const item of cartItems) {
      // CORRIGIDO: Busca na tabela "produtos" e nas colunas corretas
      const { rows } = await db.query('SELECT nome, preco, quantidade_estoque FROM produtos WHERE id = $1', [item.id]);
      const productInDb = rows[0];

      if (!productInDb || productInDb.quantidade_estoque < item.quantity) {
        return res.status(400).json({ message: `Produto "${item.nome}" fora de estoque!` });
      }
      totalAmount += parseFloat(productInDb.preco) * item.quantity;
    }
    
    // 2. Gerar chave PIX e criar o pedido na tabela "pedidos"
    const pixKey = uuidv4();
    const { rows: orderRows } = await db.query(
      // CORRIGIDO: Insere na tabela "pedidos" com as colunas em português
      'INSERT INTO pedidos (valor_total, chave_pix, status) VALUES ($1, $2, $3) RETURNING *',
      [totalAmount, pixKey, 'aguardando_pagamento']
    );

    // 3. Abater do estoque na tabela "produtos"
    for (const item of cartItems) {
      // CORRIGIDO: Atualiza a coluna "quantidade_estoque"
      await db.query(
        'UPDATE produtos SET quantidade_estoque = quantidade_estoque - $1 WHERE id = $2',
        [item.quantity, item.id]
      );
    }
    
    // 4. Retornar a resposta para o frontend
    res.status(201).json({
      message: 'Pedido criado com sucesso!',
      order: orderRows[0],
      pixKey: pixKey
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Ocorreu um erro ao processar o pedido." });
  }
});

module.exports = router;