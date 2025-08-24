const express = require('express');
const router = express.Router();
const db = require('../database');
const authMiddleware = require('../middleware/authMiddleware'); // Middleware para verificar se está logado
const adminMiddleware = require('../middleware/adminMiddleware');

// ROTA PARA CRIAR UM NOVO PEDIDO (AGORA PROTEGIDA)
// O cliente precisa estar logado para acessar esta rota.
router.post('/', authMiddleware, async (req, res) => {
  const { cartItems } = req.body;
  const clienteId = req.user.id; // Pegamos o ID do cliente diretamente do token verificado

  if (!cartItems || cartItems.length === 0) {
    return res.status(400).json({ message: "O carrinho está vazio!" });
  }
  
  const client = await db.getClient();

  try {
    await client.query('BEGIN'); // Inicia transação

    let valorTotal = 0;
    for (const item of cartItems) {
      const { rows } = await client.query('SELECT nome, preco, quantidade_estoque FROM "produtos" WHERE id = $1 FOR UPDATE', [item.id]);
      const produtoNoBanco = rows[0];
      if (!produtoNoBanco || produtoNoBanco.quantidade_estoque < item.quantity) {
        throw new Error(`Produto "${item.nome}" fora de estoque!`);
      }
      valorTotal += parseFloat(produtoNoBanco.preco) * item.quantity;
    }
    
    const { rows: pedidoRows } = await client.query(
      'INSERT INTO "pedidos" (cliente_id, valor_total, status) VALUES ($1, $2, $3) RETURNING *',
      [clienteId, valorTotal, 'pagamento_pendente']
    );
    const novoPedido = pedidoRows[0];

    for (const item of cartItems) {
        const produto = (await client.query('SELECT preco FROM "produtos" WHERE id = $1', [item.id])).rows[0];
        await client.query('INSERT INTO "itens_pedido" (pedido_id, produto_id, quantidade, preco_no_momento_da_compra) VALUES ($1, $2, $3, $4)', [novoPedido.id, item.id, item.quantity, produto.preco]);
        await client.query('UPDATE "produtos" SET quantidade_estoque = quantidade_estoque - $1 WHERE id = $2', [item.quantity, item.id]);
    }

    await client.query('COMMIT'); 
    res.status(201).json({ message: 'Pedido criado com sucesso!', pedido: novoPedido });

  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: "Ocorreu um erro ao processar o pedido: " + err.message });
  } finally {
    client.release();
  }
});

// Rota para o cliente buscar seus próprios pedidos
router.get('/meus-pedidos', authMiddleware, async (req, res) => { /* ...código existente... */ });

// Rota para Admin buscar TODOS os pedidos
router.get('/', adminMiddleware, async (req, res) => { /* ...código existente... */ });

module.exports = router;