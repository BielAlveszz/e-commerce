const CarrinhoModel = require('../models/carrinhoModel');

const getCarrinho = async (req, res) => {
    try {
        const items = await CarrinhoModel.findOrCreate(req.user.id);
        res.json({ items });
    } catch (error) {
        console.error('Erro ao buscar carrinho:', error);
        res.status(500).json({ message: 'Erro ao buscar carrinho.' });
    }
};

const addItem = async (req, res) => {
    // AGORA RECEBEMOS O produto_variante_id
    const { produto_id, quantidade = 1, produto_variante_id = null } = req.body;

    if (!produto_id || typeof produto_id !== 'number') {
        return res.status(400).json({ message: 'produto_id é obrigatório e deve ser um número.' });
    }
    if (quantidade < 1 || !Number.isInteger(quantidade)) {
        return res.status(400).json({ message: 'quantidade deve ser um inteiro positivo.' });
    }

    try {
        await CarrinhoModel.upsertItem(req.user.id, produto_id, quantidade, produto_variante_id);
        const items = await CarrinhoModel.findOrCreate(req.user.id);
        res.status(201).json({ items });
    } catch (error) {
        console.error('Erro ao adicionar item:', error);
        res.status(400).json({ message: error.message });
    }
};

const updateItem = async (req, res) => {
    const produtoId = parseInt(req.params.produto_id);
    const { quantidade, produto_variante_id = null } = req.body; // Recebemos a variante para saber qual atualizar

    if (isNaN(produtoId)) {
        return res.status(400).json({ message: 'produto_id inválido.' });
    }
    if (typeof quantidade !== 'number' || !Number.isInteger(quantidade) || quantidade < 0) {
        return res.status(400).json({ message: 'quantidade deve ser um inteiro não-negativo.' });
    }

    try {
        await CarrinhoModel.updateItem(req.user.id, produtoId, quantidade, produto_variante_id);
        const items = await CarrinhoModel.findOrCreate(req.user.id);
        res.json({ items });
    } catch (error) {
        console.error('Erro ao atualizar item:', error);
        res.status(400).json({ message: error.message });
    }
};

const removeItem = async (req, res) => {
    const produtoId = parseInt(req.params.produto_id);
    // Para deleção (que é via URL), recebemos a variante por Query Params
    const varianteIdParam = req.query.varianteId; 
    const produto_variante_id = varianteIdParam ? parseInt(varianteIdParam) : null;

    if (isNaN(produtoId)) {
        return res.status(400).json({ message: 'produto_id inválido.' });
    }

    try {
        await CarrinhoModel.removeItem(req.user.id, produtoId, produto_variante_id);
        const items = await CarrinhoModel.findOrCreate(req.user.id);
        res.json({ items });
    } catch (error) {
        console.error('Erro ao remover item:', error);
        res.status(500).json({ message: 'Erro ao remover item.' });
    }
};

const clearCart = async (req, res) => {
    try {
        await CarrinhoModel.clearCart(req.user.id);
        res.json({ items: [] });
    } catch (error) {
        console.error('Erro ao limpar carrinho:', error);
        res.status(500).json({ message: 'Erro ao limpar carrinho.' });
    }
};

const mergeCart = async (req, res) => {
    const { items } = req.body;

    if (!Array.isArray(items)) {
        return res.status(400).json({ message: 'items deve ser um array.' });
    }

    try {
        await CarrinhoModel.mergeCart(req.user.id, items);
        const mergedItems = await CarrinhoModel.findOrCreate(req.user.id);
        res.json({ items: mergedItems });
    } catch (error) {
        console.error('Erro ao fazer merge do carrinho:', error);
        res.status(500).json({ message: 'Erro ao sincronizar carrinho.' });
    }
};

module.exports = { getCarrinho, addItem, updateItem, removeItem, clearCart, mergeCart };