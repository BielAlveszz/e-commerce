import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CashCoin, BoxSeam, Receipt } from 'react-bootstrap-icons';
import { apiFetch, API_URL } from '../services/Api';
import { onImgError } from '../utils/imgPlaceholder';

// ----------------------------------------------------------------
// Gráfico de barras SVG — sem dependência externa
// ----------------------------------------------------------------
const SalesChart = ({ data, modo }) => {
  const [tooltip, setTooltip] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="d-flex align-items-center justify-content-center"
        style={{ height: 200, color: '#bbb', fontSize: '0.9rem' }}>
        Nenhuma venda nos últimos 30 dias.
      </div>
    );
  }

  // Preenche todos os dias dos últimos 30, mesmo sem venda
  const diasCompletos = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const dia = d.toISOString().split('T')[0];
    const found = data.find(r => r.dia === dia);
    return {
      dia,
      label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      valor: found ? (modo === 'faturamento' ? found.faturamento : found.total_pedidos) : 0,
    };
  });

  const maxValor = Math.max(...diasCompletos.map(d => d.valor), 1);

  // Dimensões do SVG
  const W = 680, H = 200, PL = 48, PR = 16, PT = 16, PB = 36;
  const chartW = W - PL - PR;
  const chartH = H - PT - PB;
  const barW = Math.floor(chartW / diasCompletos.length) - 2;

  const fmt = (v) => modo === 'faturamento'
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
    : `${v} pedido${v !== 1 ? 's' : ''}`;

  // Labels do eixo Y (4 linhas)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(p => ({
    y: PT + chartH * (1 - p),
    label: modo === 'faturamento'
      ? new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(maxValor * p)
      : String(Math.round(maxValor * p)),
  }));

  // Labels do eixo X — mostra só a cada 5 dias para não poluir
  const xLabels = diasCompletos.filter((_, i) => i % 5 === 0 || i === diasCompletos.length - 1);

  return (
    <div style={{ position: 'relative' }}>
      <svg
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        style={{ overflow: 'visible', display: 'block' }}
      >
        {/* Linhas de grade horizontais */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={PL} y1={t.y} x2={W - PR} y2={t.y}
              stroke="#f0ebe8" strokeWidth={i === 0 ? 0 : 1} />
            <text x={PL - 6} y={t.y + 4} textAnchor="end"
              style={{ fontSize: 10, fill: '#bbb', fontFamily: 'Inter, sans-serif' }}>
              {t.label}
            </text>
          </g>
        ))}

        {/* Barras */}
        {diasCompletos.map((d, i) => {
          const barH = d.valor === 0 ? 0 : Math.max(2, (d.valor / maxValor) * chartH);
          const x = PL + i * (chartW / diasCompletos.length) + 1;
          const y = PT + chartH - barH;
          const isHov = tooltip?.i === i;

          return (
            <g key={d.dia}
              onMouseEnter={e => setTooltip({ i, dia: d.label, valor: d.valor, x: e.clientX, y: e.clientY })}
              onMouseLeave={() => setTooltip(null)}
              style={{ cursor: 'pointer' }}
            >
              {/* Área de hover invisível (toda a altura da coluna) */}
              <rect x={x} y={PT} width={barW} height={chartH}
                fill="transparent" />
              {/* Barra real */}
              <rect
                x={x} y={y} width={barW} height={barH}
                rx={3}
                fill={isHov ? '#b8927f' : '#c9a8a0'}
                style={{ transition: 'fill 0.15s' }}
              />
            </g>
          );
        })}

        {/* Labels eixo X */}
        {xLabels.map((d, i) => {
          const idx = diasCompletos.findIndex(dd => dd.dia === d.dia);
          const x = PL + idx * (chartW / diasCompletos.length) + barW / 2;
          return (
            <text key={i} x={x} y={H - 4} textAnchor="middle"
              style={{ fontSize: 10, fill: '#bbb', fontFamily: 'Inter, sans-serif' }}>
              {d.label}
            </text>
          );
        })}
      </svg>

      {/* Tooltip flutuante */}
      {tooltip && (
        <div style={{
          position: 'fixed',
          left: tooltip.x + 12,
          top: tooltip.y - 40,
          background: '#5a4a45',
          color: '#fff',
          padding: '6px 10px',
          borderRadius: 6,
          fontSize: 12,
          pointerEvents: 'none',
          zIndex: 9999,
          whiteSpace: 'nowrap',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}>
          <strong>{tooltip.dia}</strong> — {fmt(tooltip.valor)}
        </div>
      )}
    </div>
  );
};

// ----------------------------------------------------------------
// Página principal
// ----------------------------------------------------------------
const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [chartModo, setChartModo] = useState('faturamento'); // 'faturamento' | 'pedidos'

  useEffect(() => {
    apiFetch('/api/dashboard/stats')
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(setStats)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const fmt = (v) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

  if (loading) return (
    <div className="container my-5 text-center">
      <div className="spinner-border" role="status" />
    </div>
  );

  if (error) return (
    <div className="container my-5">
      <div className="alert alert-danger">
        Não foi possível carregar as estatísticas. Tente recarregar a página.
      </div>
    </div>
  );

  return (
    <div className="container my-5">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <h1 className="mb-0">Painel do Administrador</h1>
        <Link to="/admin/produtos/novo" className="btn btn-dark-custom">+ Novo Produto</Link>
      </div>

      {/* Cards de estatísticas */}
      <div className="row g-4 mb-5">
        <div className="col-12 col-md-4">
          <div className="card text-bg-success h-100">
            <div className="card-body d-flex align-items-center">
              <CashCoin size={48} className="me-3 flex-shrink-0" />
              <div>
                <h5 className="card-title">Faturamento Total</h5>
                <p className="card-text fs-4 fw-bold mb-0">{fmt(stats?.faturamento)}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-4">
          <div className="card text-bg-info h-100">
            <div className="card-body d-flex align-items-center">
              <BoxSeam size={48} className="me-3 flex-shrink-0" />
              <div>
                <h5 className="card-title">Total de Pedidos</h5>
                <p className="card-text fs-4 fw-bold mb-0">{stats?.total_pedidos || 0}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-4">
          <div className="card text-bg-warning h-100">
            <div className="card-body d-flex align-items-center">
              <Receipt size={48} className="me-3 flex-shrink-0" />
              <div>
                <h5 className="card-title">Ticket Médio</h5>
                <p className="card-text fs-4 fw-bold mb-0">{fmt(stats?.ticket_medio)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de vendas */}
      <div className="card mb-5">
        <div className="card-header d-flex flex-wrap align-items-center justify-content-between gap-2">
          <h5 className="mb-0">Vendas — últimos 30 dias</h5>
          <div className="btn-group btn-group-sm" role="group">
            <button
              type="button"
              className={`btn ${chartModo === 'faturamento' ? 'btn-dark-custom' : 'btn-outline-custom'}`}
              onClick={() => setChartModo('faturamento')}
            >
              Faturamento
            </button>
            <button
              type="button"
              className={`btn ${chartModo === 'pedidos' ? 'btn-dark-custom' : 'btn-outline-custom'}`}
              onClick={() => setChartModo('pedidos')}
            >
              Pedidos
            </button>
          </div>
        </div>
        <div className="card-body" style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 480 }}>
            <SalesChart data={stats?.vendas_por_dia} modo={chartModo} />
          </div>
        </div>
      </div>

      {/* Top 5 produtos mais vendidos */}
      {stats?.top_produtos?.length > 0 && (
        <div className="card mb-5">
          <div className="card-header">
            <h5 className="mb-0">Top 5 Produtos Mais Vendidos</h5>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th className="ps-3" style={{ width: 40 }}>#</th>
                    <th>Produto</th>
                    <th className="text-center">Unidades Vendidas</th>
                    <th className="text-end pe-3">Receita Gerada</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.top_produtos.map((prod, idx) => (
                    <tr key={prod.id}>
                      <td className="ps-3">
                        <span className="fw-bold" style={{
                          color: idx === 0 ? '#d4a574' : idx === 1 ? '#aaa' : idx === 2 ? '#c9a8a0' : '#ccc',
                          fontSize: idx < 3 ? '1.1rem' : '0.95rem',
                        }}>
                          {idx + 1}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-3">
                          <img
                            src={`${API_URL}/images/${prod.url_imagem}`}
                            alt={prod.nome}
                            style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8 }}
                            onError={onImgError}
                          />
                          <span className="fw-500">{prod.nome}</span>
                        </div>
                      </td>
                      <td className="text-center">
                        <span className="badge"
                          style={{ backgroundColor: 'var(--meby-rosa-claro)', color: 'var(--meby-texto-escuro)', fontSize: '0.85rem', padding: '6px 12px' }}>
                          {prod.total_vendido} un
                        </span>
                      </td>
                      <td className="text-end pe-3 fw-bold" style={{ color: 'var(--meby-texto-escuro)' }}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prod.receita_gerada)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Últimos pedidos */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">Últimos Pedidos</h2>
        <Link to="/admin/pedidos" className="btn btn-outline-custom btn-sm">Ver Todos</Link>
      </div>
      <div className="card">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th className="ps-3">ID</th>
                  <th>Cliente</th>
                  <th>Valor</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {!stats?.ultimos_pedidos?.length && (
                  <tr>
                    <td colSpan="4" className="text-center text-muted py-4">
                      Nenhum pedido ainda.
                    </td>
                  </tr>
                )}
                {stats?.ultimos_pedidos?.map(pedido => (
                  <tr key={pedido.id}>
                    <td className="ps-3">#{pedido.id}</td>
                    <td>{pedido.cliente_nome || 'Cliente avulso'}</td>
                    <td>{fmt(pedido.valor_total)}</td>
                    <td>
                      <span className={`badge text-capitalize ${pedido.status === 'pago' ? 'bg-success' : 'bg-warning text-dark'}`}>
                        {pedido.status.replace(/_/g, ' ')}
                      </span>
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