const express = require('express');
const router = express.Router();
const db = require('../database');
const adminMiddleware = require('../middleware/adminMiddleware');

// --- ROTAS PÚBLICAS ---

// Rota para buscar todos os produtos (com filtro de busca)
router.get('/', async (req, res) => {
  const { search } = req.query;
  let query = 'SELECT * FROM produtos WHERE esta_ativo = TRUE';
  const queryParams = [];

  if (search) {
    queryParams.push(`%${search}%`);
    query += ` AND nome ILIKE $1`;
  }
  query += ' ORDER BY id ASC';

  try {
    const { rows } = await db.query(query, queryParams);
    res.json(rows);
  } catch (err) {
    res.status(500).send('Erro no servidor');
  }
});

// Rota para buscar um único produto pelo ID
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


// --- ROTAS DE ADMIN (PROTEGIDAS) ---
// Para proteger, descomente as linhas com adminMiddleware quando o tiver criado

// ROTA para CRIAR um novo produto
router.post('/',  adminMiddleware, async (req, res) => {
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

// ROTA para ATUALIZAR um produto existente
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

// ROTA para DELETAR um produto
router.delete('/:id', adminMiddleware, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('DELETE FROM produtos WHERE id = $1', [id]);
        if (result.rowCount === 0) return res.status(404).json({ message: 'Produto não encontrado.' });
        res.status(204).send(); // Sucesso, sem conteúdo para retornar
    } catch (err) {
        res.status(500).json({ message: 'Erro ao deletar produto.' });
    }
});

module.exports = router;