import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { CashCoin, BoxSeam, Receipt } from 'react-bootstrap-icons'; // Ícones para os cards

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const { token } = useAuth();

    useEffect(() => {
        // Busca as estatísticas da nova rota da API
        fetch('http://localhost:3001/api/dashboard/stats', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
            setStats(data);
            setLoading(false);
        })
        .catch(error => {
            console.error("Erro ao buscar estatísticas:", error);
            setLoading(false);
        });
    }, [token]);

    if (loading) {
        return <div className="container my-5 text-center"><h2>Carregando dashboard...</h2></div>;
    }

    // Formata os valores monetários
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    return (
        <div className="container my-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h1>Painel do Administrador</h1>
                <Link to="/admin/produtos/novo" className="btn btn-primary">Adicionar Novo Produto</Link>
            </div>

            {/* SEÇÃO DE CARDS DE ESTATÍSTICAS */}
            <div className="row g-4 mb-5">
                <div className="col-md-4">
                    <div className="card text-bg-success h-100">
                        <div className="card-body d-flex align-items-center">
                            <CashCoin size={48} className="me-3" />
                            <div>
                                <h5 className="card-title">Faturamento Total</h5>
                                <p className="card-text fs-4 fw-bold">{formatCurrency(stats?.faturamento || 0)}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card text-bg-info h-100">
                        <div className="card-body d-flex align-items-center">
                            <BoxSeam size={48} className="me-3" />
                            <div>
                                <h5 className="card-title">Total de Pedidos</h5>
                                <p className="card-text fs-4 fw-bold">{stats?.total_pedidos || 0}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card text-bg-warning h-100">
                        <div className="card-body d-flex align-items-center">
                            <Receipt size={48} className="me-3" />
                            <div>
                                <h5 className="card-title">Ticket Médio</h5>
                                <p className="card-text fs-4 fw-bold">{formatCurrency(stats?.ticket_medio || 0)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* SEÇÃO DE PEDIDOS RECENTES */}
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h2 className="mb-0">Últimos Pedidos</h2>
                <Link to="/admin/pedidos" className="btn btn-secondary">Ver Todos os Pedidos</Link>
            </div>
            <div className="card">
                <div className="card-body">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle">
                            <thead>
                                <tr>
                                    <th>ID do Pedido</th>
                                    <th>Cliente</th>
                                    <th>Valor Total</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats?.ultimos_pedidos?.map(pedido => (
                                    <tr key={pedido.id}>
                                        <td>#{pedido.id}</td>
                                        <td>{pedido.cliente_nome || 'Cliente avulso'}</td>
                                        <td>{formatCurrency(pedido.valor_total)}</td>
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
        </div>
    );
};

export default AdminDashboard;