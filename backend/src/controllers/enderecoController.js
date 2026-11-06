const EnderecoModel = require('../models/enderecoModel');
const { z } = require('zod');

// Validação simples e flexível
const enderecoSchema = z.object({
    apelido:         z.string().min(1, 'Dê um nome para este local (Ex: Casa, Metrô Sé).'),
    tipo_entrega:    z.enum(['casa', 'ponto_encontro']),
    descricao_local: z.string().min(5, 'Descreva o endereço ou o ponto de encontro.'),
    principal:       z.boolean().optional().default(false)
});

const getMeusEnderecos = async (req, res) => {
    try {
        const enderecos = await EnderecoModel.findByCliente(req.user.id);
        res.json(enderecos);
    } catch (error) {
        console.error('Erro ao buscar endereços:', error);
        res.status(500).json({ message: 'Erro ao buscar endereços.' });
    }
};

const adicionarEndereco = async (req, res) => {
    try {
        const dadosValidados = enderecoSchema.parse(req.body);
        const novoEndereco = await EnderecoModel.create(req.user.id, dadosValidados);
        res.status(201).json({ message: 'Local adicionado com sucesso.', endereco: novoEndereco });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: 'Dados inválidos.', erros: error.errors });
        }
        console.error('Erro ao adicionar endereço:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

const definirPrincipal = async (req, res) => {
    try {
        const enderecoId = parseInt(req.params.id);
        const endereco = await EnderecoModel.updatePrincipal(req.user.id, enderecoId);
        
        if (!endereco) {
            return res.status(404).json({ message: 'Endereço não encontrado.' });
        }
        res.json({ message: 'Endereço principal atualizado.', endereco });
    } catch (error) {
        console.error('Erro ao atualizar endereço principal:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

const deletarEndereco = async (req, res) => {
    try {
        const enderecoId = parseInt(req.params.id);
        const rowCount = await EnderecoModel.remove(req.user.id, enderecoId);
        
        if (rowCount === 0) {
            return res.status(404).json({ message: 'Endereço não encontrado.' });
        }
        res.status(204).send();
    } catch (error) {
        console.error('Erro ao deletar endereço:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

module.exports = {
    getMeusEnderecos,
    adicionarEndereco,
    definirPrincipal,
    deletarEndereco
};