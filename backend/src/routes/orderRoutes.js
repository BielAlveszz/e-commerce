const express = require('express');
const router = express.Router();
const db = require('../database');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const { generatePixPayload } = require('../utils/geradorPix'); // Importa a nova função

// ROTA PARA CRIAR UM NOVO PEDIDO (com PIX funcional)
router.post('/', authMiddleware, async (req, res) => {
  const { cartItems } = req.body;
  const clienteId = req.user.id;

  if (!cartItems || cartItems.length === 0) {
    return res.status(400).json({ message: "O carrinho está vazio!" });
  }
  
  try {
    let valorTotal = 0;
    for (const item of cartItems) {
      const { rows } = await db.query('SELECT nome, preco, quantidade_estoque FROM "produtos" WHERE id = $1', [item.id]);
      const produtoNoBanco = rows[0];
      if (!produtoNoBanco || produtoNoBanco.quantidade_estoque < item.quantity) {
        throw new Error(`Produto "${item.nome}" fora de estoque!`);
      }
      valorTotal += parseFloat(produtoNoBanco.preco) * item.quantity;
    }
    
    // Cria o pedido primeiro para obter um ID
    const { rows: pedidoRows } = await db.query(
      'INSERT INTO "pedidos" (cliente_id, valor_total, status) VALUES ($1, $2, $3) RETURNING *',
      [clienteId, valorTotal, 'pagamento_pendente']
    );
    const novoPedido = pedidoRows[0];

    // Gera um ID de transação único para o PIX
    const txid = `MEBYPEDIDO${novoPedido.id}`.replace(/[^a-zA-Z0-9]/g, '').substring(0, 25);

    // Gera o payload do BR Code para o PIX
    const pixPayload = generatePixPayload({
        pixKey: 'ggalaves2006@hotmail.com', // IMPORTANTE: Substitua pela sua chave PIX real (CPF, CNPJ, Email, etc.)
        merchantName: 'Gabriel Gonçalves Alves', // Nome que aparecerá para o cliente
        merchantCity: 'SAO PAULO', // Cidade do seu negócio (sem acentos, máx 15 caracteres)
        txid: txid,
        amount: valorTotal
    });

    // Atualiza o pedido no banco com o payload PIX gerado
    await db.query('UPDATE "pedidos" SET chave_pix = $1 WHERE id = $2', [pixPayload, novoPedido.id]);

    // Adiciona o payload ao objeto de resposta
    novoPedido.chave_pix = pixPayload;
    
    // Insere os itens na tabela "itens_pedido" e abate do estoque
    for (const item of cartItems) {
      const produto = (await db.query('SELECT preco FROM "produtos" WHERE id = $1', [item.id])).rows[0];
      await db.query('INSERT INTO "itens_pedido" (pedido_id, produto_id, quantidade, preco_no_momento_da_compra) VALUES ($1, $2, $3, $4)', [novoPedido.id, item.id, item.quantity, produto.preco]);
      await db.query('UPDATE "produtos" SET quantidade_estoque = quantidade_estoque - $1 WHERE id = $2', [item.quantity, item.id]);
    }

    res.status(201).json({ message: 'Pedido criado com sucesso!', pedido: novoPedido });
  } catch (err) {
    console.error("ERRO AO PROCESSAR PEDIDO:", err);
    res.status(500).json({ message: "Ocorreu um erro ao processar o pedido: " + err.message });
  }
});

// ROTA PARA CLIENTE BUSCAR SEUS PEDIDOS
router.get('/meus-pedidos', authMiddleware, async (req, res) => {
    try {
        const clienteId = req.user.id;
        const { rows } = await db.query('SELECT * FROM pedidos WHERE cliente_id = $1 ORDER BY criado_em DESC', [clienteId]);
        res.json(rows);
    } catch (error) {
        console.error("Erro ao buscar pedidos do cliente:", error);
        res.status(500).json({ message: 'Erro no servidor.' });
    }
});

// ROTA PARA ADMIN BUSCAR TODOS OS PEDIDOS
router.get('/', adminMiddleware, async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT p.id, p.valor_total, p.status, p.criado_em, c.nome AS cliente_nome, c.email AS cliente_email
            FROM pedidos p LEFT JOIN clientes c ON p.cliente_id = c.id
            ORDER BY p.criado_em DESC
        `);
        res.json(rows);
    } catch (error) {
        console.error("Erro ao buscar todos os pedidos:", error);
        res.status(500).json({ message: 'Erro no servidor.' });
    }
});

module.exports = router;