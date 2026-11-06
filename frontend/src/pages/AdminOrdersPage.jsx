import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiFetch } from '../services/Api';

// Mapa de status: label, cor do badge, próximas ações possíveis
const STATUS_CONFIG = {
  pagamento_pendente: {
    label: 'Pag. Pendente',
    badge: 'bg-warning text-dark',
    acoes: [{ status: 'cancelado', label: 'Cancelar', variant: 'outline-danger' }],
  },
  pago: {
    label: 'Pago',
    badge: 'bg-success',
    acoes: [
      { status: 'em_separacao', label: 'Iniciar Separação', variant: 'dark-custom' },
      { status: 'cancelado', label: 'Cancelar', variant: 'outline-danger' },
    ],
  },
  em_separacao: {
    label: 'Em Separação',
    badge: 'bg-info text-dark',
    acoes: [
      { status: 'enviado', label: 'Marcar como Enviado', variant: 'dark-custom' },
      { status: 'cancelado', label: 'Cancelar', variant: 'outline-danger' },
    ],
  },
  enviado: {
    label: 'Enviado',
    badge: 'bg-primary',
    acoes: [
      { status: 'entregue', label: 'Confirmar Entrega', variant: 'dark-custom' },
    ],
  },
  entregue: {
    label: 'Entregue',
    badge: 'bg-success',
    acoes: [],
  },
  cancelado: {
    label: 'Cancelado',
    badge: 'bg-danger',
    acoes: [],
  },
  recusado: {
    label: 'Recusado',
    badge: 'bg-danger',
    acoes: [],
  },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || { label: status, badge: 'bg-secondary' };
  return (
    <span className={`badge text-capitalize ${cfg.badge}`}>
      {cfg.label}
    </span>
  );
};

const AcoesStatus = ({ pedido, onUpdated }) => {
  const [loading, setLoading] = useState(null);
  const cfg = STATUS_CONFIG[pedido.status];
  if (!cfg || cfg.acoes.length === 0) return null;

  const handleAcao = async (novoStatus) => {
    setLoading(novoStatus);
    try {
      const res = await apiFetch(`/api/pedidos/${pedido.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: novoStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Falha ao atualizar status.');
      toast.success(`Pedido #${pedido.id} → ${STATUS_CONFIG[novoStatus]?.label}`);
      onUpdated();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="d-flex flex-wrap gap-1">
      {cfg.acoes.map(acao => (
        <button
          key={acao.status}
          className={`btn btn-sm btn-${acao.variant}`}
          disabled={loading !== null}
          onClick={() => handleAcao(acao.status)}
        >
          {loading === acao.status
            ? <span className="spinner-border spinner-border-sm" role="status" />
            : acao.label
          }
        </button>
      ))}
    </div>
  );
};

const AdminOrdersPage = () => {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const LIMIT = 20;

  const fetchPedidos = useCallback(async (p = 1, s = '') => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({ page: p, limit: LIMIT });
      if (s.trim()) params.append('search', s.trim());
      const res = await apiFetch(`/api/pedidos?${params.toString()}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPedidos(Array.isArray(data) ? data : []);
      setPage(p);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPedidos(1, ''); }, [fetchPedidos]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    fetchPedidos(1, searchInput);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearch('');
    fetchPedidos(1, '');
  };

  const pedidosFiltrados = filtroStatus === 'todos'
    ? pedidos
    : pedidos.filter(p => p.status === filtroStatus);

  const statusFiltros = [
    { value: 'todos', label: 'Todos' },
    { value: 'pagamento_pendente', label: 'Pendentes' },
    { value: 'pago', label: 'Pagos' },
    { value: 'em_separacao', label: 'Em Separação' },
    { value: 'enviado', label: 'Enviados' },
    { value: 'entregue', label: 'Entregues' },
    { value: 'cancelado', label: 'Cancelados' },
  ];

  if (loading) return (
    <div className="container my-5 text-center">
      <div className="spinner-border" role="status" />
    </div>
  );

  if (error) return (
    <div className="container my-5">
      <div className="alert alert-danger">
        Não foi possível carregar os pedidos.{' '}
        <button className="btn btn-sm btn-outline-danger ms-2" onClick={() => fetchPedidos(1)}>
          Tentar novamente
        </button>
      </div>
    </div>
  );

  return (
    <div className="container my-5">
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><Link to="/admin/dashboard">Dashboard</Link></li>
          <li className="breadcrumb-item active">Pedidos</li>
        </ol>
      </nav>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="mb-0">Gerenciar Pedidos</h1>

        <Link to="/admin/pedidos/pdv" className="btn btn-success fw-bold shadow-sm">
          <i className="bi bi-cart-plus me-2"></i> {/* Ícone opcional */}
          Nova Venda Manual (PDV)
        </Link>
      </div>

      {/* Busca por cliente ou email */}
      <form onSubmit={handleSearch} className="mb-3" style={{ maxWidth: 480 }}>
        <div className="input-group">
          <input
            type="text"
            className="form-control"
            placeholder="Buscar por cliente, email ou nº do pedido..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
          <button type="submit" className="btn btn-dark-custom">Buscar</button>
          {search && (
            <button type="button" className="btn btn-outline-secondary" onClick={handleClearSearch}>
              Limpar
            </button>
          )}
        </div>
        {search && !loading && (
          <small className="text-muted mt-1 d-block">
            {pedidos.length} pedido(s) encontrado(s) para "{search}"
          </small>
        )}
      </form>

      {/* Filtros de status */}
      <div className="d-flex flex-wrap gap-2 mb-4">
        {statusFiltros.map(f => (
          <button
            key={f.value}
            className={`btn btn-sm ${filtroStatus === f.value ? 'btn-dark-custom' : 'btn-outline-custom'}`}
            onClick={() => setFiltroStatus(f.value)}
          >
            {f.label}
            {f.value !== 'todos' && (
              <span className="ms-1 opacity-75">
                ({pedidos.filter(p => p.status === f.value).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {pedidosFiltrados.length === 0 ? (
        <p className="text-muted">Nenhum pedido encontrado para este filtro.</p>
      ) : (
        <div className="card">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th className="ps-3">ID</th>
                    <th>Cliente</th>
                    <th className="d-none d-md-table-cell">Email</th>
                    <th className="d-none d-sm-table-cell">Data</th>
                    <th>Valor</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {pedidosFiltrados.map(pedido => (
                    <tr key={pedido.id}>
                      <td className="ps-3 fw-bold">#{pedido.id}</td>
                      <td>{pedido.cliente_nome || 'Cliente avulso'}</td>
                      <td className="d-none d-md-table-cell text-muted small">
                        {pedido.cliente_email || '-'}
                      </td>
                      <td className="d-none d-sm-table-cell text-muted small">
                        {new Date(pedido.criado_em).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="fw-bold">
                        R$ {parseFloat(pedido.valor_total).toFixed(2)}
                      </td>
                      <td><StatusBadge status={pedido.status} /></td>
                      <td>
                        <AcoesStatus pedido={pedido} onUpdated={() => fetchPedidos(page)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Paginação */}
      {pedidos.length === LIMIT && (
        <div className="d-flex justify-content-center gap-2 mt-4">
          <button
            className="btn btn-outline-custom btn-sm"
            disabled={page <= 1}
            onClick={() => fetchPedidos(page - 1, search)}
          >
            ← Anterior
          </button>
          <span className="text-muted small align-self-center">Página {page}</span>
          <button
            className="btn btn-outline-custom btn-sm"
            onClick={() => fetchPedidos(page + 1)}
          >
            Próxima →
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminOrdersPage;