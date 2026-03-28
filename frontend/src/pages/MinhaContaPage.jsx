import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Whatsapp, CheckCircleFill, CircleFill, Circle, Search } from 'react-bootstrap-icons';
import toast from 'react-hot-toast';
import { API_URL, WHATSAPP_NUMBER, apiFetch } from '../services/Api';

const TIMELINE = [
  { status: 'pagamento_pendente', label: 'Aguardando Pagamento' },
  { status: 'pago',               label: 'Pago'                 },
  { status: 'em_separacao',       label: 'Em Separação'         },
  { status: 'enviado',            label: 'Enviado'              },
  { status: 'entregue',           label: 'Entregue'             },
];

const OrderTimeline = ({ status }) => {
  const isCancelado = status === 'cancelado' || status === 'recusado';
  const currentIdx  = TIMELINE.findIndex(s => s.status === status);

  if (isCancelado) {
    return (
      <div className="d-flex align-items-center gap-2 mb-3 p-2 rounded"
        style={{ background: '#fff5f5', border: '1px solid #fcc' }}>
        <span className="badge bg-danger">
          Pedido {status === 'cancelado' ? 'Cancelado' : 'Recusado'}
        </span>
      </div>
    );
  }

  return (
    <div className="mb-3">
      <div className="d-flex align-items-center" style={{ overflowX: 'auto', paddingBottom: 4 }}>
        {TIMELINE.map((step, idx) => {
          const done    = idx < currentIdx;
          const current = idx === currentIdx;
          const future  = idx > currentIdx;
          return (
            <React.Fragment key={step.status}>
              <div className="d-flex flex-column align-items-center flex-shrink-0" style={{ minWidth: 72 }}>
                <div style={{ fontSize: 20, lineHeight: 1 }}>
                  {done    && <CheckCircleFill color="var(--meby-rosa-seco)" />}
                  {current && <CircleFill color="var(--meby-rosa-seco)" />}
                  {future  && <Circle color="#ccc" />}
                </div>
                <span className="text-center mt-1" style={{
                  fontSize: 10, lineHeight: 1.3, maxWidth: 68,
                  color: future ? '#bbb' : 'var(--meby-texto-escuro)',
                  fontWeight: current ? 600 : 400,
                }}>
                  {step.label}
                </span>
              </div>
              {idx < TIMELINE.length - 1 && (
                <div className="flex-grow-1 flex-shrink-0" style={{
                  height: 2, minWidth: 20, marginBottom: 22,
                  backgroundColor: done ? 'var(--meby-rosa-seco)' : '#e0e0e0',
                }} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

const PixModal = ({ pedido, onClose }) => {
  const copiar = () => {
    navigator.clipboard.writeText(pedido.pix_copia_cola);
    toast.success('Código PIX copiado!');
  };
  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Pagar Pedido #{pedido.id}</h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body text-center">
            <p>Aponte a câmera para o QR Code ou use o Copia e Cola.</p>
            <img src={`data:image/jpeg;base64,${pedido.pix_qrcode_base64}`} alt="QR Code PIX"
              className="img-fluid my-3" style={{ width: 240, height: 240 }} />
            <div className="input-group">
              <input type="text" className="form-control" value={pedido.pix_copia_cola} readOnly />
              <button className="btn btn-outline-secondary" onClick={copiar}>Copiar</button>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Fechar</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const OrderDetails = ({ pedido }) => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    apiFetch(`/api/pedidos/detalhes/${pedido.id}`)
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(setDetails)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [pedido.id]);

  const handleWhatsApp = () => {
    if (!details) return;
    if (!WHATSAPP_NUMBER) { toast.error('Número do WhatsApp não configurado.'); return; }
    const total = parseFloat(details.pedido.valor_total).toFixed(2);
    const lista = details.itens.map(i => `- ${i.quantidade}x ${i.nome}`).join('\n');
    const msg   = `Olá! Gostaria de combinar a entrega do meu pedido #${details.pedido.id}.\n\n*Resumo:*\n${lista}\n\n*Total: R$ ${total}*`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (loading) return <p className="p-3 text-muted">Carregando detalhes...</p>;
  if (error || !details) return <p className="p-3 text-danger">Não foi possível carregar os detalhes.</p>;

  return (
    <div className="p-3" style={{ background: '#faf8f6' }}>
      <OrderTimeline status={pedido.status} />
      <h6 className="mb-3">Itens do Pedido:</h6>
      <ul className="list-unstyled mb-4">
        {details.itens.map((item, i) => (
          <li key={i} className="d-flex align-items-center mb-3">
            <img src={`${API_URL}/images/${item.url_imagem}`} alt={item.nome}
              className="rounded me-3 flex-shrink-0"
              style={{ width: 52, height: 52, objectFit: 'cover' }} />
            <div className="flex-grow-1">
              <p className="mb-0 fw-bold">{item.nome}</p>
              <small className="text-muted">
                {item.quantidade} x R$ {parseFloat(item.preco_no_momento_da_compra).toFixed(2)}
              </small>
            </div>
            <span className="ms-2 fw-bold text-nowrap">
              R$ {(item.quantidade * parseFloat(item.preco_no_momento_da_compra)).toFixed(2)}
            </span>
          </li>
        ))}
      </ul>
      {['pago', 'em_separacao', 'enviado'].includes(pedido.status) && (
        <button className="btn btn-success w-100" onClick={handleWhatsApp}>
          <Whatsapp className="me-2" /> Falar com a Vendedora via WhatsApp
        </button>
      )}
    </div>
  );
};

const STATUS_CONFIG = {
  pagamento_pendente: { label: 'Pag. Pendente', cls: 'bg-warning text-dark' },
  pago:               { label: 'Pago',          cls: 'bg-success'           },
  em_separacao:       { label: 'Em Separação',  cls: 'bg-info text-dark'    },
  enviado:            { label: 'Enviado',        cls: 'bg-primary'           },
  entregue:           { label: 'Entregue',       cls: 'bg-success'           },
  cancelado:          { label: 'Cancelado',      cls: 'bg-danger'            },
  recusado:           { label: 'Recusado',       cls: 'bg-danger'            },
};

const PedidoHeader = ({ pedido, isExpanded, onToggle, onPagar }) => {
  const s = STATUS_CONFIG[pedido.status] || { label: pedido.status, cls: 'bg-secondary' };

  return (
    <div className="d-flex flex-wrap align-items-start gap-2 p-2">
      <button
        className={`accordion-button flex-grow-1 ${isExpanded ? '' : 'collapsed'}`}
        type="button"
        onClick={onToggle}
        style={{ minWidth: 0 }}
      >
        <div className="d-flex flex-column w-100 pe-2 gap-1">
          {/* Linha superior: ID + valor + status + data */}
          <div className="d-flex flex-wrap align-items-center gap-2">
            <span className="fw-bold">Pedido #{pedido.id}</span>
            <span className="fw-bold" style={{ color: 'var(--meby-rosa-seco)' }}>
              R$ {parseFloat(pedido.valor_total).toFixed(2)}
            </span>
            <span className={`badge ${s.cls}`}>{s.label}</span>
            <small className="text-muted ms-auto">
              {new Date(pedido.criado_em).toLocaleDateString('pt-BR')}
            </small>
          </div>
          {/* Linha inferior: nomes dos produtos */}
          {pedido.produtos_resumo && (
            <span className="text-muted" style={{ fontSize: '0.82rem', lineHeight: 1.4 }}>
              {pedido.produtos_resumo.length > 80
                ? pedido.produtos_resumo.substring(0, 80) + '...'
                : pedido.produtos_resumo
              }
            </span>
          )}
        </div>
      </button>
      {pedido.status === 'pagamento_pendente' && (
        <button className="btn btn-dark-custom btn-sm flex-shrink-0 mt-1" onClick={onPagar}>
          Pagar Agora
        </button>
      )}
    </div>
  );
};

const MinhaContaPage = () => {
  const [pedidos, setPedidos]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [pedidoParaPagar, setPedidoParaPagar] = useState(null);
  const [search, setSearch]         = useState('');
  const [searchInput, setSearchInput] = useState('');
  const { user } = useAuth();

  const fetchPedidos = useCallback((s = '') => {
    setLoading(true);
    setError(false);
    const params = s.trim() ? `?search=${encodeURIComponent(s.trim())}` : '';
    apiFetch(`/api/pedidos/meus-pedidos${params}`)
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => { setPedidos(data); setExpandedId(null); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchPedidos(); }, [fetchPedidos]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    fetchPedidos(searchInput);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearch('');
    fetchPedidos('');
  };

  if (loading && pedidos.length === 0) return (
    <div className="container text-center my-5">
      <div className="spinner-border" role="status" />
    </div>
  );

  if (error) return (
    <div className="container my-5">
      <div className="alert alert-danger">
        Não foi possível carregar seus pedidos.{' '}
        <button className="btn btn-sm btn-outline-danger ms-2" onClick={() => fetchPedidos(search)}>
          Tentar novamente
        </button>
      </div>
    </div>
  );

  return (
    <div className="container my-5">
      {pedidoParaPagar && (
        <PixModal pedido={pedidoParaPagar} onClose={() => setPedidoParaPagar(null)} />
      )}

      <h1 className="mb-1">Minha Conta</h1>
      {user && <p className="lead text-muted mb-5">Olá, {user.nome}!</p>}

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
        <h2 className="mb-0">Histórico de Pedidos</h2>
      </div>

      {/* Busca */}
      <form onSubmit={handleSearch} className="mb-4" style={{ maxWidth: 480 }}>
        <div className="input-group">
          <span className="input-group-text"><Search size={15} /></span>
          <input
            type="text"
            className="form-control"
            placeholder="Buscar por número do pedido ou produto..."
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
      </form>

      {/* Resultado da busca */}
      {search && (
        <p className="text-muted small mb-3">
          {loading ? 'Buscando...' : `${pedidos.length} pedido(s) encontrado(s) para "${search}"`}
        </p>
      )}

      {pedidos.length === 0 ? (
        <div className="text-center py-5 text-muted">
          {search
            ? <><p>Nenhum pedido encontrado para "{search}".</p>
                <button className="btn btn-outline-custom btn-sm" onClick={handleClearSearch}>
                  Ver todos os pedidos
                </button></>
            : <p>Você ainda não fez nenhum pedido.</p>
          }
        </div>
      ) : (
        <div className="accordion">
          {pedidos.map(pedido => (
            <div key={pedido.id} className="accordion-item mb-2 border rounded overflow-hidden">
              <h2 className="accordion-header m-0">
                <PedidoHeader
                  pedido={pedido}
                  isExpanded={expandedId === pedido.id}
                  onToggle={() => setExpandedId(p => p === pedido.id ? null : pedido.id)}
                  onPagar={() => setPedidoParaPagar(pedido)}
                />
              </h2>
              {expandedId === pedido.id && (
                <div className="accordion-collapse">
                  <div className="accordion-body p-0">
                    <OrderDetails pedido={pedido} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MinhaContaPage;