const db = require('../database');

// Valida e retorna o cupom — não aplica ainda, só verifica
const validar = async (codigo, valorCarrinho) => {
    const { rows } = await db.query(
        `SELECT * FROM cupons
         WHERE UPPER(codigo) = UPPER($1)
           AND ativo = TRUE
           AND (expira_em IS NULL OR expira_em > NOW())
           AND (usos_maximos IS NULL OR usos_atuais < usos_maximos)`,
        [codigo.trim()]
    );

    if (rows.length === 0) {
        throw new Error('Cupom inválido ou expirado.');
    }

    const cupom = rows[0];

    if (valorCarrinho < parseFloat(cupom.valor_minimo)) {
        throw new Error(
            `Este cupom exige pedido mínimo de R$ ${parseFloat(cupom.valor_minimo).toFixed(2)}.`
        );
    }

    // Calcula o desconto
    let desconto = 0;
    if (cupom.tipo === 'percentual') {
        desconto = (valorCarrinho * parseFloat(cupom.valor)) / 100;
    } else {
        desconto = Math.min(parseFloat(cupom.valor), valorCarrinho);
    }

    return {
        id:       cupom.id,
        codigo:   cupom.codigo,
        tipo:     cupom.tipo,
        valor:    parseFloat(cupom.valor),
        desconto: parseFloat(desconto.toFixed(2)),
    };
};

// Incrementa o contador de usos (chamado ao finalizar o pedido)
const registrarUso = async (cupomId) => {
    await db.query(
        'UPDATE cupons SET usos_atuais = usos_atuais + 1 WHERE id = $1',
        [cupomId]
    );
};

// CRUD para o admin
const findAll = async () => {
    const { rows } = await db.query(
        'SELECT * FROM cupons ORDER BY criado_em DESC'
    );
    return rows;
};

const create = async ({ codigo, tipo, valor, valor_minimo, usos_maximos, expira_em }) => {
    const { rows } = await db.query(
        `INSERT INTO cupons (codigo, tipo, valor, valor_minimo, usos_maximos, expira_em)
         VALUES (UPPER($1), $2, $3, $4, $5, $6) RETURNING *`,
        [codigo, tipo, valor, valor_minimo || 0, usos_maximos || null, expira_em || null]
    );
    return rows[0];
};

const toggleAtivo = async (id) => {
    const { rows } = await db.query(
        'UPDATE cupons SET ativo = NOT ativo WHERE id = $1 RETURNING *',
        [id]
    );
    return rows[0];
};

const remove = async (id) => {
    await db.query('DELETE FROM cupons WHERE id = $1', [id]);
};

module.exports = { validar, registrarUso, findAll, create, toggleAtivo, remove };