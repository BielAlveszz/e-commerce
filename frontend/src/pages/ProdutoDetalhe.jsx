import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { StarFill } from 'react-bootstrap-icons';
import toast from 'react-hot-toast';

const ProdutoDetalhe = () => {
    const [produto, setProduto] = useState(null);
    const [avaliacoes, setAvaliacoes] = useState([]);
    const [loading, setLoading] = useState(true);
    const { id } = useParams();
    const { addToCart } = useCart();
    const { isAuthenticated, token } = useAuth();

    // Estados para o formulário de nova avaliação
    const [novaNota, setNovaNota] = useState(0);
    const [novoComentario, setNovoComentario] = useState('');

    // Função para buscar os dados do produto e suas avaliações
    const fetchData = () => {
        setLoading(true);
        Promise.all([
            fetch(`http://localhost:3001/api/produtos/${id}`),
            fetch(`http://localhost:3001/api/avaliacoes/produto/${id}`)
        ])
        .then(async([produtoRes, avaliacoesRes]) => {
            if (!produtoRes.ok) throw new Error('Produto não encontrado');
            const produtoData = await produtoRes.json();
            const avaliacoesData = await avaliacoesRes.json();
            setProduto(produtoData);
            setAvaliacoes(avaliacoesData);
        })
        .catch(err => {
            console.error("Erro ao buscar dados da página do produto:", err);
            setProduto(null); // Garante que a página mostrará "Não encontrado" em caso de erro
        })
        .finally(() => setLoading(false));
    };

    // Busca os dados quando o ID na URL muda
    useEffect(() => {
        fetchData();
    }, [id]);
    
    // Função para enviar uma nova avaliação
    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        if (novaNota === 0) return toast.error('Por favor, selecione uma nota de 1 a 5 estrelas.');
        if (!isAuthenticated) return toast.error('Você precisa estar logado para avaliar.');

        try {
            const response = await fetch('http://localhost:3001/api/avaliacoes', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ produto_id: id, nota: novaNota, comentario: novoComentario })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Não foi possível enviar sua avaliação.');
            
            toast.success('Obrigado pela sua avaliação!');
            setNovaNota(0);
            setNovoComentario('');
            fetchData(); // Recarrega os dados para mostrar a nova avaliação
        } catch (error) {
            toast.error(`Erro: ${error.message}`);
        }
    };

    // Renderiza o estado de carregamento
    if (loading) {
        return (
            <div className="container text-center my-5">
                <h1>Carregando produto...</h1>
            </div>
        );
    }

    // Renderiza se o produto não for encontrado
    if (!produto) {
        return (
            <div className="container text-center my-5">
                <h1>Produto não encontrado!</h1>
                <Link to="/" className="btn btn-primary">Voltar para a Home</Link>
            </div>
        );
    }

    // Renderização principal da página
 return (
        <main className="container my-5">
            <div className="row g-5">
                <div className="col-md-6">
                    <img 
                        // CORREÇÃO: Usamos a URL completa do backend
                        src={`http://localhost:3001/images/${produto.url_imagem}`} 
                        alt={produto.nome} 
                        className="img-fluid rounded shadow-sm"
                        onError={(e) => { e.target.onerror = null; e.target.src="https://via.placeholder.com/600x600?text=Imagem+Indisponível" }}
                    />
                </div>
                <div className="col-md-6 d-flex flex-column justify-content-center">
                    <nav aria-label="breadcrumb">
                        <ol className="breadcrumb">
                            <li className="breadcrumb-item"><Link to="/">Home</Link></li>
                            <li className="breadcrumb-item active" aria-current="page">{produto.nome}</li>
                        </ol>
                    </nav>
                    <h1 className="display-5">{produto.nome}</h1>
                    <p className="fs-3 fw-bold text-dark">R$ {parseFloat(produto.preco).toFixed(2)}</p>
                    <p className="lead">{produto.descricao}</p>
                    <p className="text-muted">Em estoque: {produto.quantidade_estoque}</p>
                    <div className="d-grid gap-2 mt-4">
                        <button 
                            className="btn btn-dark-custom btn-lg" 
                            onClick={() => addToCart(produto)} 
                            disabled={produto.quantidade_estoque === 0}
                        >
                            {produto.quantidade_estoque > 0 ? "Adicionar ao Carrinho" : "Esgotado"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Seção de Avaliações */}
            <hr className="my-5" />
            <div className="row">
                <div className="col-md-7">
                    <h2 className="mb-4">Avaliações de Clientes ({avaliacoes.length})</h2>
                    {avaliacoes.length === 0 ? (
                        <p className="text-muted">Este produto ainda não tem avaliações. Seja o primeiro a avaliar!</p>
                    ) : (
                        avaliacoes.map(review => (
                            <div key={review.id} className="mb-4 border-bottom pb-3">
                                <h5 className="mb-1">{review.cliente_nome}</h5>
                                <div className="d-flex align-items-center mb-2">
                                    {[...Array(5)].map((_, i) => (
                                        <StarFill key={i} color={i < review.nota ? '#ffc107' : '#e4e5e9'} className="me-1" />
                                    ))}
                                </div>
                                <p>{review.comentario}</p>
                                <small className="text-muted">Em {new Date(review.criado_em).toLocaleDateString('pt-BR')}</small>
                            </div>
                        ))
                    )}
                </div>

                {/* Formulário de Nova Avaliação */}
                {isAuthenticated && (
                    <div className="col-md-5">
                        <h4>Deixe sua avaliação</h4>
                        <form onSubmit={handleReviewSubmit} className="card p-4 bg-light">
                            <div className="mb-3">
                                <label className="form-label">Sua nota</label>
                                <div className="fs-4">
                                    {[...Array(5)].map((_, i) => (
                                        <StarFill 
                                            key={i} 
                                            color={i < novaNota ? '#ffc107' : '#e4e5e9'}
                                            className="me-1"
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => setNovaNota(i + 1)}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="mb-3">
                                <label htmlFor="comentario" className="form-label">Seu comentário (opcional)</label>
                                <textarea 
                                    id="comentario" 
                                    rows="4" 
                                    className="form-control"
                                    value={novoComentario}
                                    onChange={(e) => setNovoComentario(e.target.value)}
                                ></textarea>
                            </div>
                            <button type="submit" className="btn btn-primary">Enviar Avaliação</button>
                        </form>
                    </div>
                )}
            </div>
        </main>
    );
};

export default ProdutoDetalhe;