import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useSearchParams } from 'react-router-dom';

const AdminDashboard = () => {
    // O estado agora armazena o objeto completo que a API retorna
    const [data, setData] = useState({ products: [], totalPages: 1, currentPage: 1 });
    const [loading, setLoading] = useState(true);
    const { token } = useAuth();
    const [searchParams] = useSearchParams();

    // Lê o parâmetro 'page' da URL. Se não existir, o valor padrão é 1.
    const currentPage = parseInt(searchParams.get('page') || '1', 10);

    // Função para buscar os produtos de uma página específica
    const fetchProducts = (page) => {
        setLoading(true);
        // Agora a requisição inclui a página e um limite de 10 itens
        fetch(`http://localhost:3001/api/produtos?page=${page}&limit=10`)
            .then(res => res.json())
            .then(apiData => {
                setData(apiData);
                setLoading(false);
            })
            .catch(error => {
                console.error("Erro ao buscar produtos:", error);
                setLoading(false);
            });
    };

    // O useEffect agora é acionado sempre que o 'currentPage' (lido da URL) muda
    useEffect(() => {
        fetchProducts(currentPage);
    }, [currentPage]);

    const handleDelete = async (productId) => {
        if (window.confirm('Tem certeza que deseja deletar este produto?')) {
            await fetch(`http://localhost:3001/api/produtos/${productId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            // Após deletar, recarrega a página atual para refletir a mudança
            fetchProducts(currentPage);
        }
    };
    
    // Função para gerar os botões de paginação
    const renderPagination = () => {
        // Se houver apenas 1 página (ou menos), não mostra os botões
        if (data.totalPages <= 1) {
            return null;
        }
        
        const pages = [];
        for (let i = 1; i <= data.totalPages; i++) {
            pages.push(
                <li key={i} className={`page-item ${i === data.currentPage ? 'active' : ''}`}>
                    <Link to={`/admin/dashboard?page=${i}`} className="page-link">{i}</Link>
                </li>
            );
        }
        return (
            <nav aria-label="Paginação de produtos">
                <ul className="pagination mb-0">
                    {pages}
                </ul>
            </nav>
        );
    };

    if (loading) {
        return <div className="container my-5 text-center"><h2>Carregando produtos...</h2></div>;
    }

    return (
        <div className="container my-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h1>Painel do Administrador</h1>
                <div className="d-flex gap-2">
                    <Link to="/admin/categorias" className="btn btn-secondary">Gerenciar Categorias</Link>
                    <Link to="/admin/pedidos" className="btn btn-info">Ver Pedidos</Link>
                    <Link to="/admin/produtos/novo" className="btn btn-primary">Adicionar Novo Produto</Link>
                </div>
            </div>

            <h2 className="mb-3">Gerenciar Produtos</h2>
            <div className="card">
                <div className="card-body">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Nome</th>
                                    <th>Preço</th>
                                    <th>Estoque</th>
                                    <th className="text-end">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.products.map(product => (
                                    <tr key={product.id}>
                                        <td>{product.id}</td>
                                        <td>{product.nome}</td>
                                        <td>R$ {parseFloat(product.preco).toFixed(2)}</td>
                                        <td>{product.quantidade_estoque}</td>
                                        <td className="text-end">
                                            <Link to={`/admin/produtos/editar/${product.id}`} className="btn btn-sm btn-secondary me-2">Editar</Link>
                                            <button onClick={() => handleDelete(product.id)} className="btn btn-sm btn-danger">Deletar</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                {/* A paginação é renderizada aqui no rodapé do card */}
                <div className="card-footer d-flex justify-content-center">
                    {renderPagination()}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;