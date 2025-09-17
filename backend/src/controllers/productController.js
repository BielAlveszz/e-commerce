const ProductModel = require('../models/productModel');

const getAllProducts = async (req, res) => {
    try {
        const data = await ProductModel.findAll(req.query);
        res.json(data);
    } catch (err) {
        console.error("ERRO DETALHADO AO BUSCAR PRODUTOS:", err);
        res.status(500).send('Erro no servidor ao buscar produtos');
    }
};

const getProductById = async (req, res) => {
    try {
        const product = await ProductModel.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Produto não encontrado.' });
        }
        res.json(product);
    } catch (err) {
        res.status(500).send('Erro no servidor');
    }
};

const getOnSaleProducts = async (req, res) => {
    try {
        const data = await ProductModel.findOnSale();
        res.json(data);
    } catch (err) {
        res.status(500).send('Erro no servidor ao buscar produtos em oferta');
    }
};

const createProduct = async (req, res) => {
    try {
        const newProduct = await ProductModel.create(req.body);
        res.status(201).json(newProduct);
    } catch (err) {
        res.status(500).json({ message: 'Erro ao criar produto.' });
    }
};

const updateProduct = async (req, res) => {
    try {
        const updatedProduct = await ProductModel.update(req.params.id, req.body);
        if (!updatedProduct) {
            return res.status(404).json({ message: 'Produto não encontrado.' });
        }
        res.json(updatedProduct);
    } catch (err) {
        res.status(500).json({ message: 'Erro ao atualizar produto.' });
    }
};

const deleteProduct = async (req, res) => {
    try {
        const rowCount = await ProductModel.remove(req.params.id);
        if (rowCount === 0) {
            return res.status(404).json({ message: 'Produto não encontrado.' });
        }
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ message: 'Erro ao deletar produto.' });
    }
};

const getBestsellerProducts = async (req, res) => {
    try {
        let data = await ProductModel.findBestsellers();
        if (!data.products || data.products.length === 0) {
            data = await ProductModel.findLatest();
        }
        res.json(data);
    } catch (err) {
        res.status(500).send('Erro no servidor ao buscar produtos em destaque');
    }
};

module.exports = {
    getAllProducts,
    getProductById,
    getOnSaleProducts,
    getBestsellerProducts,
    createProduct,
    updateProduct,
    deleteProduct,
};