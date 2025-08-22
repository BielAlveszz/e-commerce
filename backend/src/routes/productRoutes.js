const express = require('express');
const router = express.Router();
const db = require('../database');

// ROTA: Pegar todos os produtos
// ENDEREÇO: GET http://localhost:3001/api/products
router.get('/', async (req, res) => {
  try {
    // CORRIGIDO: Agora busca na tabela "produtos"
    const { rows } = await db.query('SELECT * FROM produtos WHERE esta_ativo = TRUE ORDER BY id ASC');
    res.json(rows);
  } catch (err) {
    console.error("ERRO DETALHADO AO BUSCAR PRODUTOS:", err);
    res.status(500).send('Erro no servidor ao buscar produtos');
  }
});

// ROTA para o administrador atualizar o estoque
// ENDEREÇO: PUT http://localhost:3001/api/products/1/stock
router.put('/:id/stock', async (req, res) => {
  const { id } = req.params;
  const { newQuantity } = req.body;

  if (typeof newQuantity !== 'number' || newQuantity < 0) {
    return res.status(400).json({ message: 'Quantidade inválida.' });
  }

  try {
    // CORRIGIDO: Atualiza a tabela "produtos" e a coluna "quantidade_estoque"
    const { rows } = await db.query(
      'UPDATE produtos SET quantidade_estoque = $1 WHERE id = $2 RETURNING *',
      [newQuantity, id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Produto não encontrado.' });
    }
    
    res.json({ message: 'Estoque atualizado!', product: rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erro no servidor');
  }
});

module.exports = router;