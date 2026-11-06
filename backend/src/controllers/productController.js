const { z }          = require('zod');
const ProductModel   = require('../models/productModel');

// ─────────────────────────────────────────────────────────────────
// Schema Zod para criação e edição de produto
// AGORA COM SUPORTE A VARIANTES (Cores, Tamanhos, etc)
// ─────────────────────────────────────────────────────────────────
const produtoSchema = z.object({
    nome: z.string({ required_error: 'Nome é obrigatório.' }).min(3).max(255),
    descricao: z.string().max(5000).optional().nullable(),
    preco: z.number({ required_error: 'Preço é obrigatório.' }).positive(),
    preco_promocional: z.number().nonnegative().optional().nullable(),
    quantidade_estoque: z.number({ required_error: 'Estoque é obrigatório.' }).int().nonnegative(),
    sub_categoria_id: z.number({ required_error: 'Sub-categoria é obrigatória.' }).int().positive(),
    url_imagem: z.string().max(255).optional().nullable(),
    esta_ativo: z.boolean().optional().default(true),
    
    // NOVO: Array opcional para receber as variantes do Frontend Admin
    variantes: z.array(
        z.object({
            id: z.number().optional(), // Se vier com ID, sabemos que é para atualizar
            sku: z.string().max(50).optional().nullable(),
            nome_variante: z.string({ required_error: 'O nome da variante é obrigatório (Ex: Vermelho).' }).min(1).max(100),
            quantidade_estoque: z.number().int().nonnegative('Estoque da variante não pode ser negativo.'),
            preco_adicional: z.number().nonnegative().optional().default(0),
        })
    ).optional().default([]),

}).refine(
    (data) => {
        if (data.preco_promocional && data.preco_promocional > 0) {
            return data.preco_promocional < data.preco;
        }
        return true;
    },
    { message: 'Preço promocional deve ser menor que o preço original.', path: ['preco_promocional'] }
);

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
// ─────────────────────────────────────────────────────────────────
const createProduct = async (req, res) => {
    try {
        const dadosValidados = produtoSchema.parse(req.body);
        const newProduct     = await ProductModel.create(dadosValidados);
        res.status(201).json(newProduct);
    } catch (err) {
        if (err instanceof z.ZodError) {
            return res.status(400).json({ message: 'Dados inválidos.', erros: formatZodErrors(err) });
        }
        console.error('Erro ao criar produto:', err);
        res.status(500).json({ message: 'Erro ao criar produto.' });
    }
};

// ─────────────────────────────────────────────────────────────────
// PUT /api/produtos/:id (admin)
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
            return res.status(400).json({ message: 'Dados inválidos.', erros: formatZodErrors(err) });
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
// ─────────────────────────────────────────────────────────────────
const updateEstoque = async (req, res) => {
    const { id }       = req.params;
    const { quantidade } = req.body;

    if (typeof quantidade !== 'number' || !Number.isInteger(quantidade) || quantidade < 0) {
        return res.status(400).json({ message: 'Quantidade deve ser um número inteiro não-negativo.' });
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