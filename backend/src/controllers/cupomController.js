const CupomModel = require('../models/cupomModel');

// POST /api/cupons/validar — frontend chama para checar o cupom
const validarCupom = async (req, res) => {
    const { codigo, valorCarrinho } = req.body;

    if (!codigo || !valorCarrinho) {
        return res.status(400).json({ message: 'Código e valor do carrinho são obrigatórios.' });
    }

    try {
        const cupom = await CupomModel.validar(codigo, parseFloat(valorCarrinho));
        res.json({ cupom });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// Admin — listar todos
const listarCupons = async (req, res) => {
    try {
        const cupons = await CupomModel.findAll();
        res.json(cupons);
    } catch {
        res.status(500).json({ message: 'Erro ao buscar cupons.' });
    }
};

// Admin — criar cupom
const criarCupom = async (req, res) => {
    const { codigo, tipo, valor, valor_minimo, usos_maximos, expira_em } = req.body;

    if (!codigo || !tipo || !valor) {
        return res.status(400).json({ message: 'Código, tipo e valor são obrigatórios.' });
    }
    if (!['percentual', 'fixo'].includes(tipo)) {
        return res.status(400).json({ message: 'Tipo deve ser "percentual" ou "fixo".' });
    }
    if (tipo === 'percentual' && (valor <= 0 || valor > 100)) {
        return res.status(400).json({ message: 'Desconto percentual deve ser entre 1 e 100.' });
    }

    try {
        const cupom = await CupomModel.create({ codigo, tipo, valor, valor_minimo, usos_maximos, expira_em });
        res.status(201).json(cupom);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ message: 'Já existe um cupom com este código.' });
        }
        res.status(500).json({ message: 'Erro ao criar cupom.' });
    }
};

// Admin — ativar/desativar
const toggleCupom = async (req, res) => {
    try {
        const cupom = await CupomModel.toggleAtivo(req.params.id);
        res.json(cupom);
    } catch {
        res.status(500).json({ message: 'Erro ao atualizar cupom.' });
    }
};

// Admin — deletar
const deletarCupom = async (req, res) => {
    try {
        await CupomModel.remove(req.params.id);
        res.status(204).send();
    } catch {
        res.status(500).json({ message: 'Erro ao deletar cupom.' });
    }
};

module.exports = { validarCupom, listarCupons, criarCupom, toggleCupom, deletarCupom };