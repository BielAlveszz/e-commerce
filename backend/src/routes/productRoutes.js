const express = require('express');
const router = express.Router();
const db = require('../database');
const adminMiddleware = require('../middleware/adminMiddleware');

// --- ROTAS PÚBLICAS ---

// ROTA ATUALIZADA: Buscar produtos com busca e paginação
router.get('/', async (req, res) => {
  // Pega os parâmetros da URL. Se não forem fornecidos, usa valores padrão.
  const { search, page = 1, limit = 10 } = req.query;

  // Calcula o 'offset', que é quantos itens pular para chegar na página correta.
  // Ex: na página 2, pulamos os 10 primeiros itens.
  const offset = (page - 1) * limit;
  let queryParams = [];
  
  // Primeira query: Contar o NÚMERO TOTAL de produtos para saber quantas páginas teremos.
  let countQuery = 'SELECT COUNT(*) FROM "produtos" WHERE esta_ativo = TRUE';
  if (search) {
    queryParams.push(`%${search}%`);
    countQuery += ` AND nome ILIKE $1`;
  }

  // Segunda query: Buscar apenas os produtos da PÁGINA ATUAL.
  let dataQuery = 'SELECT * FROM "produtos" WHERE esta_ativo = TRUE';
  if (search) {
    dataQuery += ` AND nome ILIKE $1`;
  }
  // LIMIT diz quantos itens pegar, OFFSET diz a partir de qual item começar.
  dataQuery += ` ORDER BY id ASC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
  queryParams.push(limit, offset);

  try {
    const totalResult = await db.query(countQuery, search ? [`%${search}%`] : []);
    const totalProducts = parseInt(totalResult.rows[0].count, 10);
    
    const { rows: products } = await db.query(dataQuery, queryParams);
    
    // A resposta agora é um objeto contendo os produtos e os dados da paginação
    res.json({
      products,
      totalPages: Math.ceil(totalProducts / limit),
      currentPage: parseInt(page, 10),
    });
  } catch (err) {
    console.error("ERRO DETALHADO AO BUSCAR PRODUTOS:", err);
    res.status(500).send('Erro no servidor ao buscar produtos');
  }
});


// Rota para buscar um único produto pelo ID (sem alterações)
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await db.query('SELECT * FROM produtos WHERE id = $1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Produto não encontrado.' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).send('Erro no servidor');
  }
});


// --- ROTAS DE ADMIN (sem alterações) ---

router.post('/', adminMiddleware, async (req, res) => {
    const { nome, descricao, preco, quantidade_estoque, url_imagem, sub_categoria_id } = req.body;
    try {
        const { rows } = await db.query(
            'INSERT INTO produtos (nome, descricao, preco, quantidade_estoque, url_imagem, sub_categoria_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [nome, descricao, preco, quantidade_estoque, url_imagem, sub_categoria_id]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        res.status(500).json({ message: 'Erro ao criar produto.' });
    }
});

router.put('/:id', adminMiddleware, async (req, res) => {
    const { id } = req.params;
    const { nome, descricao, preco, quantidade_estoque, url_imagem, sub_categoria_id } = req.body;
    try {
        const { rows } = await db.query(
            'UPDATE produtos SET nome = $1, descricao = $2, preco = $3, quantidade_estoque = $4, url_imagem = $5, sub_categoria_id = $6 WHERE id = $7 RETURNING *',
            [nome, descricao, preco, quantidade_estoque, url_imagem, sub_categoria_id, id]
        );
        if (rows.length === 0) return res.status(404).json({ message: 'Produto não encontrado.' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ message: 'Erro ao atualizar produto.' });
    }
});

router.delete('/:id', adminMiddleware, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('DELETE FROM produtos WHERE id = $1', [id]);
        if (result.rowCount === 0) return res.status(404).json({ message: 'Produto não encontrado.' });
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ message: 'Erro ao deletar produto.' });
    }
});

module.exports = router;