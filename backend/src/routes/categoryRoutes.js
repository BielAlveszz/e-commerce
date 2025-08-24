const express = require('express');
const router = express.Router();
const db = require('../database');
const adminMiddleware = require('../middleware/adminMiddleware'); // Descomente para proteger as rotas

// ROTA para buscar todas as CATEGORIAS principais
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM "categorias" ORDER BY nome ASC');
    res.json(rows);
  } catch (err) {
    console.error("Erro ao buscar categorias:", err);
    res.status(500).send('Erro no servidor');
  }
});

// ROTA para buscar todas as SUB-CATEGORIAS (pode filtrar por categoria_id)
router.get('/sub', async (req, res) => {
  const { categoriaId } = req.query;
  let query = 'SELECT * FROM "sub_categorias"';
  const params = [];
  if (categoriaId) {
    query += ' WHERE categoria_id = $1';
    params.push(categoriaId);
  }
  query += ' ORDER BY nome ASC';

  try {
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error("Erro ao buscar sub-categorias:", err);
    res.status(500).send('Erro no servidor');
  }
});

// ROTA para CRIAR uma nova SUB-CATEGORIA
router.post('/sub', adminMiddleware, async (req, res) => {
  const { nome, categoria_id } = req.body;
  if (!nome || !categoria_id) {
    return res.status(400).json({ message: "Nome e ID da categoria principal são obrigatórios." });
  }
  try {
    const { rows } = await db.query(
      'INSERT INTO "sub_categorias" (nome, categoria_id) VALUES ($1, $2) RETURNING *',
      [nome, categoria_id]
    );
    res.status(201).json(rows[0]); // Retorna a nova sub-categoria criada
  } catch (error) {
    console.error("Erro ao criar sub-categoria:", error);
    res.status(500).json({ message: "Erro no servidor." });
  }
});


module.exports = router;