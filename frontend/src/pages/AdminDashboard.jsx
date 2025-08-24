import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const AdminDashboard = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const { token } = useAuth();

    // Função para buscar a lista de produtos da API
    const fetchProducts = () => {
        setLoading(true);
        fetch('http://localhost:3001/api/produtos')
            .then(res => res.json())
            .then(data => {
                setProducts(data);
                setLoading(false);
            })
            .catch(error => {
                console.error("Erro ao buscar produtos:", error);
                setLoading(false);
            });
    };

    // Executa a busca de produtos assim que a página carrega
    useEffect(() => {
        fetchProducts();
    }, []);

    // Função para deletar um produto
    const handleDelete = async (productId) => {
        // Pede uma confirmação ao usuário antes de deletar
        if (window.confirm('Tem certeza que deseja deletar este produto? Esta ação não pode ser desfeita.')) {
            try {
                const response = await fetch(`http://localhost:3001/api/produtos/${productId}`, {
                    method: 'DELETE',
                    headers: { 
                        'Authorization': `Bearer ${token}` 
                    }
                });

                if (!response.ok) {
                    throw new Error('Falha ao deletar o produto.');
                }
                
                // Atualiza a lista de produtos na tela para remover o item deletado, sem precisar recarregar a página
                setProducts(products.filter(p => p.id !== productId));
                alert('Produto deletado com sucesso!');

            } catch (error) {
                console.error("Erro ao deletar produto:", error);
                alert(error.message);
            }
        }
    };

    if (loading) {
        return <div className="container my-5 text-center"><h2>Carregando produtos...</h2></div>;
    }

    return (
        <div className="container my-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h1>Painel do Administrador</h1>
                <div className="d-flex gap-2">
                    {/* Link para a página de gerenciar pedidos */}
                    <Link to="/admin/pedidos" className="btn btn-info">
                        Ver Pedidos
                    </Link>
                    {/* Link para a página de criar um novo produto */}
                    <Link to="/admin/produtos/novo" className="btn btn-primary">
                        Adicionar Novo Produto
                    </Link>
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
                                {products.length > 0 ? (
                                    products.map(product => (
                                        <tr key={product.id}>
                                            <td>{product.id}</td>
                                            <td>{product.nome}</td>
                                            <td>R$ {parseFloat(product.preco).toFixed(2)}</td>
                                            <td>{product.quantidade_estoque}</td>
                                            <td className="text-end">
                                                {/* Link para a página de edição do produto específico */}
                                                <Link to={`/admin/produtos/editar/${product.id}`} className="btn btn-sm btn-secondary me-2">Editar</Link>
                                                <button onClick={() => handleDelete(product.id)} className="btn btn-sm btn-danger">Deletar</button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="text-center text-muted">Nenhum produto cadastrado.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;