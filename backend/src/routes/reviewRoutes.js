const express = require('express');
const router = express.Router();
const db = require('../database');
const authMiddleware = require('../middleware/authMiddleware'); // Middleware para verificar o login

// ROTA para buscar as avaliações de um produto específico (Pública)
// ENDEREÇO: GET /api/avaliacoes/produto/1
router.get('/produto/:produtoId', async (req, res) => {
    const { produtoId } = req.params;
    try {
        const { rows } = await db.query(`
            SELECT a.id, a.nota, a.comentario, a.criado_em, c.nome AS cliente_nome
            FROM avaliacoes a
            JOIN clientes c ON a.cliente_id = c.id
            WHERE a.produto_id = $1
            ORDER BY a.criado_em DESC
        `, [produtoId]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar avaliações.' });
    }
});

// ROTA para um cliente criar uma nova avaliação (Protegida)
// ENDEREÇO: POST /api/avaliacoes
router.post('/', authMiddleware, async (req, res) => {
    const clienteId = req.user.id;
    const { produto_id, nota, comentario } = req.body;

    if (!produto_id || !nota) {
        return res.status(400).json({ message: 'Produto e nota são obrigatórios.' });
    }

    try {
        const { rows } = await db.query(
            'INSERT INTO avaliacoes (produto_id, cliente_id, nota, comentario) VALUES ($1, $2, $3, $4) RETURNING *',
            [produto_id, clienteId, nota, comentario]
        );
        res.status(201).json(rows[0]);
    } catch (error) {
        // Código '23505' é violação de chave única (cliente já avaliou este produto)
        if (error.code === '23505') {
            return res.status(409).json({ message: 'Você já avaliou este produto.' });
        }
        res.status(500).json({ message: 'Erro ao salvar avaliação.' });
    }
});

module.exports = router;