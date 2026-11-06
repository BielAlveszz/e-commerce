import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/Api';
import toast from 'react-hot-toast';

const AdminManualOrderPage = () => {
    const [produtos, setProdutos] = useState([]);
    const [loadingProdutos, setLoadingProdutos] = useState(true);
    
    // Estados do formulário de adição
    const [produtoSelecionadoId, setProdutoSelecionadoId] = useState('');
    const [varianteSelecionadaId, setVarianteSelecionadaId] = useState('');
    const [quantidade, setQuantidade] = useState(1);
    
    // Estado do carrinho manual
    const [itensPedido, setItensPedido] = useState([]);
    const [valorTotalManual, setValorTotalManual] = useState('');
    
    const [loadingSubmit, setLoadingSubmit] = useState(false);

    // Busca os produtos ao carregar a página
    useEffect(() => {
        const fetchProdutos = async () => {
            try {
                // Traz os produtos (ajuste o limite se tiver muitos produtos)
                const res = await apiFetch('/api/produtos?limit=100');
                const data = await res.json();
                if (res.ok) {
                    setProdutos(data.products || []);
                }
            } catch (error) {
                toast.error('Erro ao buscar lista de produtos.');
            } finally {
                setLoadingProdutos(false);
            }
        };
        fetchProdutos();
    }, []);

    const produtoSelecionado = produtos.find(p => p.id === parseInt(produtoSelecionadoId));

    const handleAdicionarItem = () => {
        if (!produtoSelecionado) return toast.error('Selecione um produto.');
        
        let estoqueDisponivel = produtoSelecionado.quantidade_estoque;
        let nomeItem = produtoSelecionado.nome;
        let precoBase = parseFloat(produtoSelecionado.preco_promocional || produtoSelecionado.preco);
        let varianteId = null;

        if (produtoSelecionado.variantes && produtoSelecionado.variantes.length > 0) {
            if (!varianteSelecionadaId) return toast.error('Selecione uma opção (cor/tamanho).');
            const variante = produtoSelecionado.variantes.find(v => v.id === parseInt(varianteSelecionadaId));
            if (!variante) return toast.error('Variante não encontrada.');
            
            estoqueDisponivel = variante.quantidade_estoque;
            nomeItem = `${produtoSelecionado.nome} - ${variante.nome_variante}`;
            precoBase += parseFloat(variante.preco_adicional || 0);
            varianteId = variante.id;
        }

        if (quantidade > estoqueDisponivel) {
            return toast.error(`Estoque insuficiente. Apenas ${estoqueDisponivel} disponíveis.`);
        }

        // Verifica se já está na lista
        const jaExiste = itensPedido.find(i => i.produto_id === produtoSelecionado.id && i.produto_variante_id === varianteId);
        if (jaExiste) {
            const novaQtd = jaExiste.quantidade + quantidade;
            if (novaQtd > estoqueDisponivel) return toast.error('Quantidade excede o estoque.');
            
            setItensPedido(itensPedido.map(i => 
                i === jaExiste ? { ...i, quantidade: novaQtd } : i
            ));
        } else {
            setItensPedido([...itensPedido, {
                produto_id: produtoSelecionado.id,
                produto_variante_id: varianteId,
                nome: nomeItem,
                quantidade: parseInt(quantidade),
                precoUnitario: precoBase
            }]);
        }

        // Reseta os campos
        setProdutoSelecionadoId('');
        setVarianteSelecionadaId('');
        setQuantidade(1);
    };

    const handleRemoverItem = (index) => {
        setItensPedido(itensPedido.filter((_, i) => i !== index));
    };

    const valorTotalCalculado = itensPedido.reduce((acc, item) => acc + (item.precoUnitario * item.quantidade), 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (itensPedido.length === 0) return toast.error('Adicione pelo menos um item.');

        setLoadingSubmit(true);
        try {
            const body = {
                itens: itensPedido,
                // Se o admin digitou um valor diferente (desconto), manda ele. Senão, manda o calculado.
                valorTotalPago: valorTotalManual ? parseFloat(valorTotalManual.replace(',', '.')) : valorTotalCalculado
            };

            const res = await apiFetch('/api/pedidos/manual', {
                method: 'POST',
                body: JSON.stringify(body)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Erro ao registrar venda.');

            toast.success('Venda registrada e estoque atualizado!');
            setItensPedido([]);
            setValorTotalManual('');
            
            // Recarrega os produtos para atualizar o estoque na tela
            const resProd = await apiFetch('/api/produtos?limit=100');
            const dataProd = await resProd.json();
            if (resProd.ok) setProdutos(dataProd.products || []);

        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoadingSubmit(false);
        }
    };

    return (
        <div className="container-fluid py-4">
            <h2 className="mb-4">Registrar Venda Manual (PDV)</h2>
            <p className="text-muted">Use esta tela para dar baixa em produtos vendidos pelo WhatsApp, Instagram ou presencialmente.</p>

            <div className="row g-4">
                {/* Lado Esquerdo: Adicionar Produtos */}
                <div className="col-md-5">
                    <div className="card shadow-sm border-0">
                        <div className="card-body">
                            <h5 className="card-title mb-4">Adicionar Item</h5>
                            
                            <div className="mb-3">
                                <label className="form-label">Produto</label>
                                <select 
                                    className="form-select" 
                                    value={produtoSelecionadoId} 
                                    onChange={(e) => {
                                        setProdutoSelecionadoId(e.target.value);
                                        setVarianteSelecionadaId('');
                                    }}
                                    disabled={loadingProdutos}
                                >
                                    <option value="">Selecione um produto...</option>
                                    {produtos.filter(p => p.esta_ativo).map(p => (
                                        <option key={p.id} value={p.id}>{p.nome}</option>
                                    ))}
                                </select>
                            </div>

                            {produtoSelecionado && produtoSelecionado.variantes && produtoSelecionado.variantes.length > 0 && (
                                <div className="mb-3">
                                    <label className="form-label">Variação (Cor/Tamanho)</label>
                                    <select 
                                        className="form-select" 
                                        value={varianteSelecionadaId} 
                                        onChange={(e) => setVarianteSelecionadaId(e.target.value)}
                                    >
                                        <option value="">Selecione uma opção...</option>
                                        {produtoSelecionado.variantes.map(v => (
                                            <option key={v.id} value={v.id} disabled={v.quantidade_estoque <= 0}>
                                                {v.nome_variante} (Estoque: {v.quantidade_estoque})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="mb-3">
                                <label className="form-label">Quantidade</label>
                                <input 
                                    type="number" 
                                    className="form-control" 
                                    min="1" 
                                    value={quantidade} 
                                    onChange={(e) => setQuantidade(parseInt(e.target.value))} 
                                />
                            </div>

                            <button className="btn btn-dark-custom w-100" onClick={handleAdicionarItem}>
                                Adicionar à Lista
                            </button>
                        </div>
                    </div>
                </div>

                {/* Lado Direito: Resumo e Fechamento */}
                <div className="col-md-7">
                    <div className="card shadow-sm border-0">
                        <div className="card-body">
                            <h5 className="card-title mb-4">Resumo da Venda</h5>
                            
                            {itensPedido.length === 0 ? (
                                <div className="alert alert-secondary">Nenhum item adicionado ainda.</div>
                            ) : (
                                <div className="table-responsive mb-4">
                                    <table className="table align-middle">
                                        <thead>
                                            <tr>
                                                <th>Item</th>
                                                <th>Qtd</th>
                                                <th>Preço Un.</th>
                                                <th>Subtotal</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {itensPedido.map((item, index) => (
                                                <tr key={index}>
                                                    <td>{item.nome}</td>
                                                    <td>{item.quantidade}</td>
                                                    <td>R$ {item.precoUnitario.toFixed(2)}</td>
                                                    <td>R$ {(item.precoUnitario * item.quantidade).toFixed(2)}</td>
                                                    <td>
                                                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleRemoverItem(index)}>
                                                            X
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr>
                                                <td colSpan="3" className="text-end fw-bold">Total Calculado:</td>
                                                <td colSpan="2" className="fw-bold">R$ {valorTotalCalculado.toFixed(2)}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}

                            <form onSubmit={handleSubmit}>
                                <div className="mb-4">
                                    <label className="form-label text-muted">
                                        Valor Total Pago pelo Cliente (R$) <small>- Altere apenas se deu desconto no WhatsApp</small>
                                    </label>
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        className="form-control form-control-lg" 
                                        placeholder={`Ex: ${valorTotalCalculado.toFixed(2)}`}
                                        value={valorTotalManual}
                                        onChange={(e) => setValorTotalManual(e.target.value)}
                                        disabled={itensPedido.length === 0}
                                    />
                                </div>

                                <button 
                                    type="submit" 
                                    className="btn btn-success btn-lg w-100" 
                                    disabled={itensPedido.length === 0 || loadingSubmit}
                                >
                                    {loadingSubmit ? 'Registrando...' : 'Confirmar Pagamento e Baixar Estoque'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminManualOrderPage;