const db = require('../database');

const getStats = async () => {
    // Usamos Promise.all para executar todas as consultas em paralelo para mais eficiência
    const [revenueResult, ordersCountResult, avgTicketResult, recentOrdersResult] = await Promise.all([
        // Consulta para o faturamento total (soma de todos os pedidos)
        db.query("SELECT SUM(valor_total) as faturamento FROM pedidos WHERE status = 'pago'"), // Consideramos apenas pedidos pagos
        
        // Consulta para o número total de pedidos
        db.query("SELECT COUNT(id) as total_pedidos FROM pedidos"),

        // Consulta para o ticket médio
        db.query("SELECT AVG(valor_total) as ticket_medio FROM pedidos WHERE status = 'pago'"),

        // Consulta para os 5 pedidos mais recentes
        db.query(`
            SELECT p.id, p.valor_total, p.status, c.nome as cliente_nome
            FROM pedidos p
            LEFT JOIN clientes c ON p.cliente_id = c.id
            ORDER BY p.criado_em DESC
            LIMIT 5
        `)
    ]);

    // Extrai e formata os resultados
    const stats = {
        faturamento: parseFloat(revenueResult.rows[0].faturamento || 0),
        total_pedidos: parseInt(ordersCountResult.rows[0].total_pedidos || 0, 10),
        ticket_medio: parseFloat(avgTicketResult.rows[0].ticket_medio || 0),
        ultimos_pedidos: recentOrdersResult.rows
    };

    return stats;
};

module.exports = {
    getStats,
};