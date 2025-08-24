import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const AdminOrdersPage = () => {
    // Inicia o estado com um array vazio para evitar o erro .map()
    const [pedidos, setPedidos] = useState([]);
    const [loading, setLoading] = useState(true);
    const { token } = useAuth();

    useEffect(() => {
        if (token) {
            fetch('http://localhost:3001/api/pedidos', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(res => {
                if (!res.ok) {
                    throw new Error('Falha ao buscar pedidos do servidor');
                }
                return res.json();
            })
            .then(data => {
                // Garante que o estado seja atualizado apenas se os dados forem um array
                if (Array.isArray(data)) {
                    setPedidos(data);
                }
            })
            .catch(error => {
                console.error("Erro ao buscar pedidos:", error);
            })
            .finally(() => {
                setLoading(false);
            });
        }
    }, [token]);

    if (loading) {
        return <div className="container my-5 text-center"><p>Carregando pedidos...</p></div>;
    }

    return (
        <div className="container my-5">
            <nav aria-label="breadcrumb">
                <ol className="breadcrumb">
                    <li className="breadcrumb-item"><Link to="/admin/dashboard">Admin Dashboard</Link></li>
                    <li className="breadcrumb-item active" aria-current="page">Gerenciar Pedidos</li>
                </ol>
            </nav>
            <h1 className="mb-4">Gerenciar Pedidos</h1>

            {pedidos.length === 0 ? (
                <p>Nenhum pedido encontrado.</p>
            ) : (
                <div className="card">
                    <div className="card-body">
                        <div className="table-responsive">
                            <table className="table table-hover align-middle">
                                <thead>
                                    <tr>
                                        <th>ID Pedido</th>
                                        <th>Cliente</th>
                                        <th>Email</th>
                                        <th>Data</th>
                                        <th>Valor Total</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pedidos.map(pedido => (
                                        <tr key={pedido.id}>
                                            <td>#{pedido.id}</td>
                                            <td>{pedido.cliente_nome || 'Cliente avulso'}</td>
                                            <td>{pedido.cliente_email || '-'}</td>
                                            <td>{new Date(pedido.criado_em).toLocaleDateString('pt-BR')}</td>
                                            <td>R$ {parseFloat(pedido.valor_total).toFixed(2)}</td>
                                            <td>
                                                <span className="badge bg-primary text-capitalize">{pedido.status.replace('_', ' ')}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminOrdersPage;