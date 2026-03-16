// Assumindo que seu '../database' exporta um Pool do pacote 'pg'
const db = require('../database');

const create = async (clienteId, cartItems) => {
    // 1. Pegamos uma conexão exclusiva do pool para iniciar a transação
    const client = await db.connect();
    
    try {
        await client.query('BEGIN'); // INICIA A TRANSAÇÃO

        let valorTotal = 0;
        const itensValidados = [];

        // 2. Checagem de estoque e bloqueio (FOR UPDATE)
        for (const item of cartItems) {
            // O "FOR UPDATE" tranca a linha deste produto no banco até o final da transação.
            // Impede compras simultâneas do mesmo produto.
            const { rows } = await client.query(
                'SELECT preco, quantidade_estoque, nome FROM produtos WHERE id = $1 FOR UPDATE',
                [item.id]
            );

            if (rows.length === 0) {
                throw new Error(`Produto não encontrado (ID: ${item.id}).`);
            }

            const produtoNoBanco = rows[0];

            if (produtoNoBanco.quantidade_estoque < item.quantity) {
                throw new Error(`O produto "${produtoNoBanco.nome}" não tem estoque suficiente.`);
            }

            valorTotal += parseFloat(produtoNoBanco.preco) * item.quantity;
            
            itensValidados.push({
                ...item,
                preco_no_momento_da_compra: produtoNoBanco.preco
            });
        }

        // 3. Cria o pedido mestre
        const { rows: pedidoRows } = await client.query(
            'INSERT INTO pedidos (cliente_id, valor_total, status) VALUES ($1, $2, $3) RETURNING *',
            [clienteId, valorTotal, 'pagamento_pendente']
        );
        const novoPedido = pedidoRows[0];

        // 4. Salva os itens e subtrai o estoque com segurança
        for (const item of itensValidados) {
            await client.query(
                'INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, preco_no_momento_da_compra) VALUES ($1, $2, $3, $4)',
                [novoPedido.id, item.id, item.quantity, item.preco_no_momento_da_compra]
            );

            await client.query(
                'UPDATE produtos SET quantidade_estoque = quantidade_estoque - $1 WHERE id = $2',
                [item.quantity, item.id]
            );
        }

        await client.query('COMMIT'); // CONFIRMA E SALVA TUDO
        return novoPedido;

    } catch (error) {
        await client.query('ROLLBACK'); // SE DEU ERRO, DESFAZ TUDO (não cobra, não cria pedido e não baixa estoque)
        throw error;
    } finally {
        client.release(); // Devolve a conexão para o banco de dados
    }
};

const addPixInfo = async (pedidoId, pixCopyPaste, mercadoPagoId, qrCodeBase64) => {
    await db.query(
        'UPDATE pedidos SET pix_copia_cola = $1, mercado_pago_id = $2, pix_qrcode_base64 = $3 WHERE id = $4', 
        [pixCopyPaste, mercadoPagoId, qrCodeBase64, pedidoId]
    );
};

const findByClient = async (clienteId) => {
    const { rows } = await db.query('SELECT * FROM pedidos WHERE cliente_id = $1 ORDER BY criado_em DESC', [clienteId]);
    return rows;
};

const findAll = async () => {
    const { rows } = await db.query(`
        SELECT p.id, p.valor_total, p.status, p.criado_em, c.nome AS cliente_nome, c.email AS cliente_email
        FROM pedidos p LEFT JOIN clientes c ON p.cliente_id = c.id
        ORDER BY p.criado_em DESC
    `);
    return rows;
};

const updateStatusByMpId = async (mercadoPagoId, status) => {
    const { rows } = await db.query(
        'UPDATE pedidos SET status = $1 WHERE mercado_pago_id = $2 RETURNING *',
        [status, mercadoPagoId]
    );
    return rows[0];
};

const findByIdAndClientId = async (orderId, clienteId) => {
    const { rows: pedidoRows } = await db.query(
        'SELECT * FROM pedidos WHERE id = $1 AND cliente_id = $2',
        [orderId, clienteId]
    );

    if (pedidoRows.length === 0) {
        return null;
    }

    const { rows: itemsRows } = await db.query(`
        SELECT 
            ip.quantidade, 
            ip.preco_no_momento_da_compra,
            p.nome,
            p.url_imagem
        FROM itens_pedido ip
        JOIN produtos p ON ip.produto_id = p.id
        WHERE ip.pedido_id = $1
    `, [orderId]);

    return {
        pedido: pedidoRows[0],
        itens: itemsRows
    };
};

module.exports = {
    create,
    addPixInfo,
    findByClient,
    findAll,
    updateStatusByMpId,
    findByIdAndClientId,
};