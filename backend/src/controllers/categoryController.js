const CategoryModel = require('../models/categoryModel');

const getAllCategories = async (req, res) => {
    try {
        const categories = await CategoryModel.findAll();
        res.json(categories);
    } catch (err) {
        res.status(500).send('Erro no servidor');
    }
};

const createCategory = async (req, res) => {
    try {
        const newCategory = await CategoryModel.create(req.body.nome);
        res.status(201).json(newCategory);
    } catch (error) {
        res.status(500).json({ message: "Erro ao criar categoria." });
    }
};

const updateCategory = async (req, res) => {
    try {
        const updatedCategory = await CategoryModel.update(req.params.id, req.body.nome);
        if (!updatedCategory) return res.status(404).json({ message: 'Categoria não encontrada.' });
        res.json(updatedCategory);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar categoria.' });
    }
};

const deleteCategory = async (req, res) => {
    try {
        await CategoryModel.remove(req.params.id);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Erro ao deletar categoria. Verifique se ela não está em uso.' });
    }
};

// Sub-categorias
const getAllSubCategories = async (req, res) => {
    try {
        const subCategories = await CategoryModel.findAllSub(req.query.categoriaId);
        res.json(subCategories);
    } catch (err) {
        res.status(500).send('Erro no servidor');
    }
};

const createSubCategory = async (req, res) => {
    try {
        const newSubCategory = await CategoryModel.createSub(req.body.nome, req.body.categoria_id);
        res.status(201).json(newSubCategory);
    } catch (error) {
        res.status(500).json({ message: "Erro ao criar sub-categoria." });
    }
};

const deleteSubCategory = async (req, res) => {
    try {
        await CategoryModel.removeSub(req.params.id);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Erro ao deletar sub-categoria.' });
    }
};

module.exports = {
    getAllCategories, createCategory, updateCategory, deleteCategory,
    getAllSubCategories, createSubCategory, deleteSubCategory
};