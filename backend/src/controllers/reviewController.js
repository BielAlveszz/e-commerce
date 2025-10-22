const ReviewModel = require('../models/reviewModel');

// Controller para buscar as avaliações de um produto
const getReviewsByProduct = async (req, res) => {
    try {
        const reviews = await ReviewModel.findByProductId(req.params.produtoId);
        res.json(reviews);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar avaliações.' });
    }
};

// Controller para criar uma nova avaliação
const createReview = async (req, res) => {
    const clienteId = req.user.id;
    const { produto_id, nota, comentario } = req.body;

    if (!produto_id || !nota) {
        return res.status(400).json({ message: 'Produto e nota são obrigatórios.' });
    }

    try {
        const newReview = await ReviewModel.create({ 
            produto_id, 
            cliente_id: clienteId, 
            nota, 
            comentario 
        });
        res.status(201).json(newReview);
    } catch (error) {
        // Código '23505' é violação de chave única (cliente já avaliou este produto)
        if (error.code === '23505') {
            return res.status(409).json({ message: 'Você já avaliou este produto.' });
        }
        res.status(500).json({ message: 'Erro ao salvar avaliação.' });
    }
};

module.exports = {
    getReviewsByProduct,
    createReview,
};