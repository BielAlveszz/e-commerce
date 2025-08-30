const express = require('express');
const router = express.Router();
const db = require('../database');
const adminMiddleware = require('../middleware/adminMiddleware');

// --- ROTAS PÚBLICAS (para a loja) ---

router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM "categorias" ORDER BY nome ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).send('Erro no servidor');
  }
});

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
    res.status(500).send('Erro no servidor');
  }
});

// --- ROTAS DE ADMIN (protegidas) ---

router.post('/', adminMiddleware, async (req, res) => {
    const { nome } = req.body;
    try {
        const { rows } = await db.query('INSERT INTO "categorias" (nome) VALUES ($1) RETURNING *', [nome]);
        res.status(201).json(rows[0]);
    } catch (error) {
        res.status(500).json({ message: "Erro ao criar categoria." });
    }
});

router.post('/sub', adminMiddleware, async (req, res) => {
  const { nome, categoria_id } = req.body;
  try {
    const { rows } = await db.query(
      'INSERT INTO "sub_categorias" (nome, categoria_id) VALUES ($1, $2) RETURNING *',
      [nome, categoria_id]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: "Erro ao criar sub-categoria." });
  }
});

// NOVA ROTA: Atualizar uma categoria principal
router.put('/:id', adminMiddleware, async (req, res) => {
    const { id } = req.params;
    const { nome } = req.body;
    try {
        const { rows } = await db.query('UPDATE "categorias" SET nome = $1 WHERE id = $2 RETURNING *', [nome, id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Categoria não encontrada.' });
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar categoria.' });
    }
});

// NOVA ROTA: Deletar uma categoria principal
router.delete('/:id', adminMiddleware, async (req, res) => {
    const { id } = req.params;
    try {
        // CUIDADO: Ao deletar uma categoria principal, o "ON DELETE CASCADE" no banco
        // irá deletar TODAS as sub-categorias associadas e pode dar erro se algum
        // produto ainda estiver usando uma dessas sub-categorias.
        await db.query('DELETE FROM "categorias" WHERE id = $1', [id]);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Erro ao deletar categoria. Verifique se ela não está em uso.' });
    }
});


router.delete('/sub/:id', adminMiddleware, async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM "sub_categorias" WHERE id = $1', [id]);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Erro ao deletar sub-categoria.' });
    }
});

module.exports = router;