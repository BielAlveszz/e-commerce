const db = require('../database');

const getStats = async () => {
    const [
        revenueResult,
        ordersCountResult,
        avgTicketResult,
        recentOrdersResult,
        chartResult,
        topProductsResult,
    ] = await Promise.all([
        db.query("SELECT SUM(valor_total) as faturamento FROM pedidos WHERE status IN ('pago','em_separacao','enviado','entregue')"),
        db.query("SELECT COUNT(id) as total_pedidos FROM pedidos"),
        db.query("SELECT AVG(valor_total) as ticket_medio FROM pedidos WHERE status IN ('pago','em_separacao','enviado','entregue')"),
        db.query(`
            SELECT p.id, p.valor_total, p.status, c.nome as cliente_nome
            FROM pedidos p
            LEFT JOIN clientes c ON p.cliente_id = c.id
            ORDER BY p.criado_em DESC
            LIMIT 5
        `),
        // Vendas dos últimos 30 dias agrupadas por dia
        db.query(`
            SELECT
                TO_CHAR(criado_em AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD') AS dia,
                COUNT(id) AS total_pedidos,
                COALESCE(SUM(CASE WHEN status IN ('pago','em_separacao','enviado','entregue') THEN valor_total ELSE 0 END), 0) AS faturamento
            FROM pedidos
            WHERE criado_em >= NOW() - INTERVAL '30 days'
            GROUP BY dia
            ORDER BY dia ASC
        `),
        // Top 5 produtos mais vendidos (por quantidade de unidades)
        db.query(`
            SELECT
                pr.id,
                pr.nome,
                pr.url_imagem,
                pr.preco,
                pr.preco_promocional,
                SUM(ip.quantidade)                        AS total_vendido,
                SUM(ip.quantidade * ip.preco_no_momento_da_compra) AS receita_gerada
            FROM itens_pedido ip
            JOIN produtos pr  ON pr.id = ip.produto_id
            JOIN pedidos p    ON p.id  = ip.pedido_id
            WHERE p.status IN ('pago','em_separacao','enviado','entregue')
            GROUP BY pr.id, pr.nome, pr.url_imagem, pr.preco, pr.preco_promocional
            ORDER BY total_vendido DESC
            LIMIT 5
        `),
    ]);

    return {
        faturamento:     parseFloat(revenueResult.rows[0].faturamento || 0),
        total_pedidos:   parseInt(ordersCountResult.rows[0].total_pedidos || 0, 10),
        ticket_medio:    parseFloat(avgTicketResult.rows[0].ticket_medio || 0),
        ultimos_pedidos: recentOrdersResult.rows,
        vendas_por_dia:  chartResult.rows.map(r => ({
            dia:           r.dia,
            total_pedidos: parseInt(r.total_pedidos, 10),
            faturamento:   parseFloat(r.faturamento),
        })),
        top_produtos: topProductsResult.rows.map(r => ({
            id:             r.id,
            nome:           r.nome,
            url_imagem:     r.url_imagem,
            total_vendido:  parseInt(r.total_vendido, 10),
            receita_gerada: parseFloat(r.receita_gerada),
        })),
    };
};

module.exports = { getStats };