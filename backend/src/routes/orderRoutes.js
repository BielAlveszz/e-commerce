const express = require('express');
const router = express.Router();
const db = require('../database');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const { MercadoPagoConfig, Payment } = require('mercadopago');

// Configura o cliente do Mercado Pago com o seu Access Token do .env
const client = new MercadoPagoConfig({ 
    accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN 
});

// ROTA PARA CRIAR UM NOVO PEDIDO (VERSÃO CORRIGIDA)
router.post('/', authMiddleware, async (req, res) => {
  const { cartItems } = req.body;
  const clienteId = req.user.id;

  if (!cartItems || cartItems.length === 0) {
    return res.status(400).json({ message: "O carrinho está vazio!" });
  }
  
  try {
    // 1. Calcula o valor total e verifica o estoque (sem transação)
    let valorTotal = 0;
    for (const item of cartItems) {
      const { rows } = await db.query('SELECT nome, preco, quantidade_estoque FROM "produtos" WHERE id = $1', [item.id]);
      const produtoNoBanco = rows[0];
      if (!produtoNoBanco || produtoNoBanco.quantidade_estoque < item.quantity) {
        throw new Error(`Produto "${item.nome}" está fora de estoque!`);
      }
      valorTotal += parseFloat(produtoNoBanco.preco) * item.quantity;
    }
    
    // 2. Cria o pedido no banco de dados
    const { rows: pedidoRows } = await db.query(
      'INSERT INTO "pedidos" (cliente_id, valor_total, status) VALUES ($1, $2, $3) RETURNING *',
      [clienteId, valorTotal, 'pagamento_pendente']
    );
    const novoPedido = pedidoRows[0];

    // 3. Prepara e envia a requisição para a API do Mercado Pago
   const payment = new Payment(client);
    const body = {
        transaction_amount: Number(valorTotal.toFixed(2)),
        description: `Pedido #${novoPedido.id} - Meby Cosméticos`,
        payment_method_id: 'pix',
        payer: {
            email: req.user.email,
            first_name: req.user.nome,
            // Adicionamos o objeto de identificação com o CPF
            identification: {
                type: 'CPF',
                number: req.user.cpf.replace(/[^\d]/g, "") // Pegamos o CPF do token
            }
        },
    };

    const pixData = await payment.create({ body });

    // 4. Extrai e salva os dados do PIX
    const qrCodeBase64 = pixData.point_of_interaction.transaction_data.qr_code_base64;
    const qrCodeCopyPaste = pixData.point_of_interaction.transaction_data.qr_code;

    await db.query('UPDATE "pedidos" SET chave_pix = $1, mercado_pago_id = $2 WHERE id = $3', 
        [qrCodeCopyPaste, pixData.id, novoPedido.id]);
    
    // 5. Insere os itens do pedido e atualiza o estoque de cada produto
    for (const item of cartItems) {
      const produto = (await db.query('SELECT preco FROM "produtos" WHERE id = $1', [item.id])).rows[0];
      await db.query('INSERT INTO "itens_pedido" (pedido_id, produto_id, quantidade, preco_no_momento_da_compra) VALUES ($1, $2, $3, $4)', [novoPedido.id, item.id, item.quantity, produto.preco]);
      await db.query('UPDATE "produtos" SET quantidade_estoque = quantidade_estoque - $1 WHERE id = $2', [item.quantity, item.id]);
    }

    // 6. Envia a resposta para o frontend
    res.status(201).json({ 
        message: 'Pedido criado com sucesso!', 
        pedido: {
            ...novoPedido,
            qr_code_base64: qrCodeBase64,
            qr_code_copia_cola: qrCodeCopyPaste
        }
    });

  } catch (err) {
    console.error("ERRO AO PROCESSAR PEDIDO:", err.cause || err.message);
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