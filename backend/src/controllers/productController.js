const { z }          = require('zod');
const ProductModel   = require('../models/productModel');

// ─────────────────────────────────────────────────────────────────
// Schema Zod para criação e edição de produto
// CORREÇÃO: antes o req.body era passado direto ao model sem
// nenhuma validação, permitindo injeção de campos arbitrários
// (mass assignment). Agora apenas os campos esperados passam.
// ─────────────────────────────────────────────────────────────────
const produtoSchema = z.object({
    nome: z
        .string({ required_error: 'Nome é obrigatório.' })
        .min(3, 'Nome deve ter no mínimo 3 caracteres.')
        .max(255, 'Nome deve ter no máximo 255 caracteres.'),

    descricao: z
        .string()
        .max(5000, 'Descrição muito longa.')
        .optional()
        .nullable(),

    preco: z
        .number({ required_error: 'Preço é obrigatório.', invalid_type_error: 'Preço deve ser um número.' })
        .positive('Preço deve ser maior que zero.')
        .multipleOf(0.01, 'Preço deve ter no máximo 2 casas decimais.'),

    preco_promocional: z
        .number({ invalid_type_error: 'Preço promocional deve ser um número.' })
        .nonnegative('Preço promocional não pode ser negativo.')
        .multipleOf(0.01)
        .optional()
        .nullable(),

    quantidade_estoque: z
        .number({ required_error: 'Estoque é obrigatório.', invalid_type_error: 'Estoque deve ser um número.' })
        .int('Estoque deve ser um número inteiro.')
        .nonnegative('Estoque não pode ser negativo.'),

    sub_categoria_id: z
        .number({ required_error: 'Sub-categoria é obrigatória.', invalid_type_error: 'sub_categoria_id deve ser um número.' })
        .int()
        .positive('Sub-categoria inválida.'),

    url_imagem: z
        .string()
        .max(255)
        .optional()
        .nullable(),

    esta_ativo: z
        .boolean()
        .optional()
        .default(true),
}).refine(
    (data) => {
        // Se preco_promocional foi informado e é maior que zero,
        // ele deve ser menor que o preco original
        if (data.preco_promocional && data.preco_promocional > 0) {
            return data.preco_promocional < data.preco;
        }
        return true;
    },
    { message: 'Preço promocional deve ser menor que o preço original.', path: ['preco_promocional'] }
);

// ─────────────────────────────────────────────────────────────────
// Helper: formata erros Zod em array simples para o frontend
// ─────────────────────────────────────────────────────────────────
const formatZodErrors = (zodError) =>
    zodError.errors.map((e) => `${e.path.join('.')}: ${e.message}`);

// ─────────────────────────────────────────────────────────────────
// GET /api/produtos
// ─────────────────────────────────────────────────────────────────
const getAllProducts = async (req, res) => {
    try {
        const data = await ProductModel.findAll(req.query);
        res.json(data);
    } catch (err) {
        console.error('Erro ao buscar produtos:', err);
        res.status(500).json({ message: 'Erro no servidor ao buscar produtos.' });
    }
};

// ─────────────────────────────────────────────────────────────────
// GET /api/produtos/:id
// ─────────────────────────────────────────────────────────────────
const getProductById = async (req, res) => {
    try {
        const product = await ProductModel.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Produto não encontrado.' });
        }
        res.json(product);
    } catch (err) {
        console.error('Erro ao buscar produto:', err);
        res.status(500).json({ message: 'Erro no servidor.' });
    }
};

// ─────────────────────────────────────────────────────────────────
// GET /api/produtos/ofertas
// ─────────────────────────────────────────────────────────────────
const getOnSaleProducts = async (req, res) => {
    try {
        const data = await ProductModel.findOnSale();
        res.json(data);
    } catch (err) {
        console.error('Erro ao buscar ofertas:', err);
        res.status(500).json({ message: 'Erro no servidor ao buscar produtos em oferta.' });
    }
};

// ─────────────────────────────────────────────────────────────────
// GET /api/produtos/destaques
// ─────────────────────────────────────────────────────────────────
const getBestsellerProducts = async (req, res) => {
    try {
        let data = await ProductModel.findBestsellers();
        // Fallback: se não há vendas ainda, retorna os mais recentes
        if (!data.products || data.products.length === 0) {
            data = await ProductModel.findLatest();
        }
        res.json(data);
    } catch (err) {
        console.error('Erro ao buscar destaques:', err);
        res.status(500).json({ message: 'Erro no servidor ao buscar produtos em destaque.' });
    }
};

// ─────────────────────────────────────────────────────────────────
// GET /api/produtos/:id/relacionados
// ─────────────────────────────────────────────────────────────────
const getRelatedProducts = async (req, res) => {
    try {
        const product = await ProductModel.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Produto não encontrado.' });
        }
        const related = await ProductModel.findRelated(req.params.id, product.sub_categoria_id);
        res.json({ products: related });
    } catch (err) {
        console.error('Erro ao buscar produtos relacionados:', err);
        res.status(500).json({ message: 'Erro no servidor.' });
    }
};

// ─────────────────────────────────────────────────────────────────
// POST /api/produtos (admin)
// CORREÇÃO: valida e sanitiza com Zod antes de qualquer operação.
// Apenas os campos do schema chegam ao model — nenhum campo extra.
// ─────────────────────────────────────────────────────────────────
const createProduct = async (req, res) => {
    try {
        const dadosValidados = produtoSchema.parse(req.body);
        const newProduct     = await ProductModel.create(dadosValidados);
        res.status(201).json(newProduct);
    } catch (err) {
        if (err instanceof z.ZodError) {
            return res.status(400).json({
                message: 'Dados inválidos.',
                erros: formatZodErrors(err),
            });
        }
        console.error('Erro ao criar produto:', err);
        res.status(500).json({ message: 'Erro ao criar produto.' });
    }
};

// ─────────────────────────────────────────────────────────────────
// PUT /api/produtos/:id (admin)
// CORREÇÃO: mesma validação Zod aplicada na edição.
// ─────────────────────────────────────────────────────────────────
const updateProduct = async (req, res) => {
    try {
        const dadosValidados  = produtoSchema.parse(req.body);
        const updatedProduct  = await ProductModel.update(req.params.id, dadosValidados);
        if (!updatedProduct) {
            return res.status(404).json({ message: 'Produto não encontrado.' });
        }
        res.json(updatedProduct);
    } catch (err) {
        if (err instanceof z.ZodError) {
            return res.status(400).json({
                message: 'Dados inválidos.',
                erros: formatZodErrors(err),
            });
        }
        console.error('Erro ao atualizar produto:', err);
        res.status(500).json({ message: 'Erro ao atualizar produto.' });
    }
};

// ─────────────────────────────────────────────────────────────────
// DELETE /api/produtos/:id (admin)
// ─────────────────────────────────────────────────────────────────
const deleteProduct = async (req, res) => {
    try {
        const rowCount = await ProductModel.remove(req.params.id);
        if (rowCount === 0) {
            return res.status(404).json({ message: 'Produto não encontrado.' });
        }
        res.status(204).send();
    } catch (err) {
        console.error('Erro ao deletar produto:', err);
        res.status(500).json({ message: 'Erro ao deletar produto.' });
    }
};

// ─────────────────────────────────────────────────────────────────
// PATCH /api/produtos/:id/estoque (admin)
// Ajuste rápido de estoque sem precisar editar o produto inteiro
// ─────────────────────────────────────────────────────────────────
const updateEstoque = async (req, res) => {
    const { id }       = req.params;
    const { quantidade } = req.body;

    if (typeof quantidade !== 'number' || !Number.isInteger(quantidade) || quantidade < 0) {
        return res.status(400).json({
            message: 'Quantidade deve ser um número inteiro não-negativo.',
        });
    }

    try {
        const produto = await ProductModel.updateEstoque(id, quantidade);
        if (!produto) {
            return res.status(404).json({ message: 'Produto não encontrado.' });
        }
        res.json({ message: 'Estoque atualizado com sucesso.', produto });
    } catch (err) {
        console.error('Erro ao atualizar estoque:', err);
        res.status(500).json({ message: 'Erro ao atualizar estoque.' });
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
    getRelatedProducts,
    updateEstoque,
};