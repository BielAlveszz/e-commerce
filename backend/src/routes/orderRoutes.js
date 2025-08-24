const express = require('express');
const router = express.Router();
const db = require('../database');
const { v4: uuidv4 } = require('uuid');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Rota para criar um novo pedido (Pública)
router.post('/', async (req, res) => { /* ...código existente sem alterações... */ });


// NOVA ROTA: Buscar os pedidos do cliente logado (Protegida)
// ENDEREÇO: GET http://localhost:3001/api/pedidos/meus-pedidos
router.get('/meus-pedidos', authMiddleware, async (req, res) => {
  try {
    const clienteId = req.user.id; // Pegamos o ID do usuário que veio do token verificado

    const { rows } = await db.query(
      'SELECT * FROM pedidos WHERE cliente_id = $1 ORDER BY criado_em DESC',
      [clienteId]
    );

    res.json(rows);
  } catch (error) {
    console.error("Erro ao buscar pedidos do cliente:", error);
    res.status(500).json({ message: 'Erro no servidor.' });
  }
});

// NOVA ROTA: Admin busca TODOS os pedidos (Protegida para Admin)
// ENDEREÇO: GET http://localhost:3001/api/pedidos/
router.get('/', adminMiddleware, async (req, res) => {
    try {
        // Query que busca todos os pedidos e junta com o nome do cliente
        const { rows } = await db.query(`
            SELECT 
                p.id, 
                p.valor_total, 
                p.status, 
                p.criado_em, 
                c.nome AS cliente_nome, 
                c.email AS cliente_email
            FROM pedidos p
            LEFT JOIN clientes c ON p.cliente_id = c.id
            ORDER BY p.criado_em DESC
        `);
        res.json(rows);
    } catch (error) {
        console.error("Erro ao buscar todos os pedidos:", error);
        res.status(500).json({ message: 'Erro no servidor.' });
    }
});

module.exports = router;