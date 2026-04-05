import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Whatsapp, CheckCircleFill, CircleFill, Circle,
  Search, PersonFill, LockFill, ClockHistory,
  ShieldLock, PencilSquare, CheckLg, XLg,
} from 'react-bootstrap-icons';
import toast from 'react-hot-toast';
import { IMaskInput } from 'react-imask';
import { API_URL, WHATSAPP_NUMBER, apiFetch } from '../services/Api';
import { Link } from 'react-router-dom';

// ─────────────────────────────────────────────────────────────
// Timeline de status do pedido
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// Modal de pagamento PIX
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// Detalhes do pedido expandido
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// Configuração de badges de status
// ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pagamento_pendente: { label: 'Pag. Pendente', cls: 'bg-warning text-dark' },
  pago:               { label: 'Pago',          cls: 'bg-success'           },
  em_separacao:       { label: 'Em Separação',  cls: 'bg-info text-dark'    },
  enviado:            { label: 'Enviado',        cls: 'bg-primary'           },
  entregue:           { label: 'Entregue',       cls: 'bg-success'           },
  cancelado:          { label: 'Cancelado',      cls: 'bg-danger'            },
  recusado:           { label: 'Recusado',       cls: 'bg-danger'            },
};

// ─────────────────────────────────────────────────────────────
// Cabeçalho de cada pedido no accordion
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// Aba: Histórico de Pedidos
// ─────────────────────────────────────────────────────────────
const TabPedidos = () => {
  const [pedidos, setPedidos]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [pedidoParaPagar, setPedidoParaPagar] = useState(null);
  const [search, setSearch]         = useState('');
  const [searchInput, setSearchInput] = useState('');

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
    <div className="text-center py-5">
      <div className="spinner-border" role="status" style={{ color: 'var(--meby-rosa-seco)' }} />
    </div>
  );

  if (error) return (
    <div className="alert alert-danger">
      Não foi possível carregar seus pedidos.{' '}
      <button className="btn btn-sm btn-outline-danger ms-2" onClick={() => fetchPedidos(search)}>
        Tentar novamente
      </button>
    </div>
  );

  return (
    <>
      {pedidoParaPagar && (
        <PixModal pedido={pedidoParaPagar} onClose={() => setPedidoParaPagar(null)} />
      )}

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

      {search && (
        <p className="text-muted small mb-3">
          {loading ? 'Buscando...' : `${pedidos.length} pedido(s) encontrado(s) para "${search}"`}
        </p>
      )}

      {pedidos.length === 0 ? (
        <div className="text-center py-5 text-muted">
          {search
            ? <>
                <p>Nenhum pedido encontrado para "{search}".</p>
                <button className="btn btn-outline-custom btn-sm" onClick={handleClearSearch}>
                  Ver todos os pedidos
                </button>
              </>
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
    </>
  );
};

// ─────────────────────────────────────────────────────────────
// Aba: Dados Pessoais
// ─────────────────────────────────────────────────────────────
const TabDadosPessoais = () => {
  const { user, updateUser } = useAuth();

  const [nome, setNome]         = useState(user?.nome     || '');
  const [email, setEmail]       = useState(user?.email    || '');
  const [telefone, setTelefone] = useState(user?.telefone || '');
  // cpf e criado_em nunca chegam pelo contexto de login — buscamos direto do /me
  const [cpf, setCpf]           = useState('');
  const [criadoEm, setCriadoEm] = useState('');
  const [loading, setLoading]   = useState(false);
  const [editando, setEditando] = useState(false);

  // Busca dados completos ao montar — inclui cpf e criado_em
  useEffect(() => {
    apiFetch('/api/clientes/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.user) {
          setNome(data.user.nome         || '');
          setEmail(data.user.email       || '');
          setTelefone(data.user.telefone || '');
          setCpf(data.user.cpf           || '');
          setCriadoEm(data.user.criado_em || '');
        }
      })
      .catch(() => {});
  }, []);

  const handleSalvar = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res  = await apiFetch('/api/clientes/me', {
        method: 'PUT',
        body: JSON.stringify({ nome, email, telefone: telefone || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erro ao salvar.');
      updateUser({ nome: data.user.nome, email: data.user.email, telefone: data.user.telefone });
      setEditando(false);
      toast.success('Perfil atualizado com sucesso!');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelar = () => {
    setNome(user?.nome         || '');
    setEmail(user?.email       || '');
    setTelefone(user?.telefone || '');
    setEditando(false);
  };

  // Formata CPF com máscara a partir do estado local (não do contexto de login)
  const cpfFormatado = cpf
    ? cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    : '—';

  // Data formatada a partir do estado local
  const membroDesde = criadoEm
    ? new Date(criadoEm).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—';

  // Iniciais para o avatar
  const iniciais = (user?.nome || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0].toUpperCase())
    .join('');

  return (
    <div>
      {/* Avatar + nome + botão editar */}
      <div className="d-flex align-items-center gap-3 mb-4">
        <div
          className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
          style={{
            width: 56, height: 56,
            backgroundColor: 'var(--meby-rosa-claro)',
            color: 'var(--meby-rosa-seco)',
            fontWeight: 700, fontSize: '1.2rem',
          }}
        >
          {iniciais}
        </div>
        <div className="flex-grow-1">
          <h5 className="mb-0">{user?.nome}</h5>
          <small className="text-muted">{user?.email}</small>
          {user?.is_admin && (
            <span
              className="badge ms-2"
              style={{ backgroundColor: 'var(--meby-rosa-seco)', fontSize: '0.7rem' }}
            >
              Admin
            </span>
          )}
        </div>
        {!editando && (
          <button
            className="btn btn-outline-custom btn-sm d-flex align-items-center gap-1"
            onClick={() => setEditando(true)}
          >
            <PencilSquare size={14} /> Editar
          </button>
        )}
      </div>

      {/* Banner de acesso admin */}
      {user?.is_admin && (
        <div
          className="d-flex align-items-center justify-content-between gap-3 rounded mb-4 p-3"
          style={{
            backgroundColor: 'var(--meby-rosa-claro)',
            border: '1px solid var(--meby-bege-quente)',
          }}
        >
          <div className="d-flex align-items-center gap-2">
            <ShieldLock size={18} style={{ color: 'var(--meby-rosa-seco)', flexShrink: 0 }} />
            <span style={{ fontSize: '0.875rem', color: 'var(--meby-texto-escuro)', fontWeight: 500 }}>
              Você tem acesso de administrador
            </span>
          </div>
          <Link
            to="/admin/dashboard"
            className="btn btn-dark-custom btn-sm flex-shrink-0"
          >
            Ir para o Painel Admin
          </Link>
        </div>
      )}

      {/* Formulário de dados */}
      <form onSubmit={handleSalvar}>
        <div className="row g-3 mb-3">
          <div className="col-12 col-md-6">
            <label className="form-label fw-bold" style={{ fontSize: '0.875rem' }}>
              Nome completo
            </label>
            <input
              type="text"
              className="form-control"
              value={nome}
              onChange={e => setNome(e.target.value)}
              disabled={!editando}
              required
            />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label fw-bold" style={{ fontSize: '0.875rem' }}>
              Telefone
            </label>
            <IMaskInput
              mask="(00) 00000-0000"
              value={telefone}
              onAccept={val => setTelefone(val)}
              type="tel"
              className="form-control"
              placeholder="(11) 99999-8888"
              disabled={!editando}
            />
          </div>
          <div className="col-12">
            <label className="form-label fw-bold" style={{ fontSize: '0.875rem' }}>
              E-mail
            </label>
            <input
              type="email"
              className="form-control"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={!editando}
              required
            />
            {editando && (
              <small className="text-muted">
                Ao alterar o e-mail você precisará fazer login novamente.
              </small>
            )}
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label fw-bold" style={{ fontSize: '0.875rem' }}>
              CPF
            </label>
            <input
              type="text"
              className="form-control"
              value={cpfFormatado}
              disabled
              title="O CPF não pode ser alterado."
            />
            <small className="text-muted">O CPF não pode ser alterado.</small>
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label fw-bold" style={{ fontSize: '0.875rem' }}>
              Membro desde
            </label>
            <input
              type="text"
              className="form-control"
              value={membroDesde}
              disabled
            />
          </div>
        </div>

        {editando && (
          <div className="d-flex gap-2 justify-content-end">
            <button
              type="button"
              className="btn btn-outline-secondary d-flex align-items-center gap-1"
              onClick={handleCancelar}
              disabled={loading}
            >
              <XLg size={14} /> Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-dark-custom d-flex align-items-center gap-1"
              disabled={loading}
            >
              {loading
                ? <><span className="spinner-border spinner-border-sm me-1" role="status" /> Salvando...</>
                : <><CheckLg size={14} /> Salvar alterações</>
              }
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Aba: Alterar Senha
// ─────────────────────────────────────────────────────────────
const TabAlterarSenha = () => {
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha]   = useState('');
  const [confirmar, setConfirmar]   = useState('');
  const [loading, setLoading]       = useState(false);

  const senhaLonga     = novaSenha.length >= 8;
  const senhaMaiuscula = /[A-Z]/.test(novaSenha);
  const senhaMinuscula = /[a-z]/.test(novaSenha);
  const senhaNumero    = /\d/.test(novaSenha);
  const senhaIgual     = novaSenha === confirmar && confirmar.length > 0;
  const senhaValida    = senhaLonga && senhaMaiuscula && senhaMinuscula && senhaNumero;

  const Regra = ({ ok, texto }) => (
    <div className="d-flex align-items-center gap-1 mb-1" style={{ fontSize: '0.8rem' }}>
      {ok
        ? <CheckCircleFill size={12} color="var(--meby-rosa-seco)" />
        : <Circle size={12} color="#ccc" />
      }
      <span style={{ color: ok ? 'var(--meby-texto-escuro)' : '#aaa' }}>{texto}</span>
    </div>
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!senhaValida) { toast.error('A nova senha não atende aos requisitos.'); return; }
    if (novaSenha !== confirmar) { toast.error('As senhas não coincidem.'); return; }
    setLoading(true);
    try {
      const res  = await apiFetch('/api/clientes/me/senha', {
        method: 'PUT',
        body: JSON.stringify({ senhaAtual, novaSenha }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erro ao alterar senha.');
      toast.success('Senha alterada com sucesso!');
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmar('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 480 }}>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label fw-bold" style={{ fontSize: '0.875rem' }}>
            Senha atual
          </label>
          <input
            type="password"
            className="form-control"
            value={senhaAtual}
            onChange={e => setSenhaAtual(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        <hr style={{ borderColor: 'var(--meby-rosa-claro)' }} />

        <div className="mb-3">
          <label className="form-label fw-bold" style={{ fontSize: '0.875rem' }}>
            Nova senha
          </label>
          <input
            type="password"
            className="form-control"
            value={novaSenha}
            onChange={e => setNovaSenha(e.target.value)}
            required
            autoComplete="new-password"
          />
          {novaSenha.length > 0 && (
            <div className="mt-2 p-2 rounded" style={{ backgroundColor: 'var(--meby-rosa-claro)' }}>
              <Regra ok={senhaLonga}     texto="Mínimo 8 caracteres" />
              <Regra ok={senhaMaiuscula} texto="Pelo menos uma letra maiúscula" />
              <Regra ok={senhaMinuscula} texto="Pelo menos uma letra minúscula" />
              <Regra ok={senhaNumero}    texto="Pelo menos um número" />
            </div>
          )}
        </div>

        <div className="mb-4">
          <label className="form-label fw-bold" style={{ fontSize: '0.875rem' }}>
            Confirmar nova senha
          </label>
          <input
            type="password"
            className="form-control"
            value={confirmar}
            onChange={e => setConfirmar(e.target.value)}
            required
            autoComplete="new-password"
            style={{
              borderColor: confirmar.length > 0
                ? senhaIgual ? '#198754' : '#dc3545'
                : undefined,
            }}
          />
          {confirmar.length > 0 && !senhaIgual && (
            <small className="text-danger">As senhas não coincidem.</small>
          )}
        </div>

        <div className="d-grid">
          <button
            type="submit"
            className="btn btn-dark-custom"
            disabled={loading || !senhaValida || !senhaIgual || !senhaAtual}
          >
            {loading
              ? <><span className="spinner-border spinner-border-sm me-2" role="status" />Alterando...</>
              : 'Alterar senha'
            }
          </button>
        </div>

        <div className="mt-3 text-center">
          <Link to="/esqueci-senha" style={{ fontSize: '0.875rem', color: 'var(--meby-rosa-seco)' }}>
            Esqueci minha senha
          </Link>
        </div>
      </form>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Componente principal — MinhaContaPage
// ─────────────────────────────────────────────────────────────
const TABS = [
  { id: 'dados',   label: 'Dados pessoais', icon: PersonFill   },
  { id: 'senha',   label: 'Alterar senha',  icon: LockFill     },
  { id: 'pedidos', label: 'Meus pedidos',   icon: ClockHistory },
];

const MinhaContaPage = () => {
  const { user } = useAuth();
  const [abaAtiva, setAbaAtiva] = useState('dados');

  return (
    <div className="container my-5">
      <div className="mb-4">
        <h1 className="mb-1">Minha Conta</h1>
        {user && (
          <p className="text-muted mb-0" style={{ fontSize: '1rem' }}>
            Olá, {user.nome?.split(' ')[0]}! Gerencie seus dados e pedidos abaixo.
          </p>
        )}
      </div>

      {/* Abas de navegação */}
      <div
        className="d-flex gap-1 mb-4 p-1 rounded"
        style={{
          backgroundColor: 'var(--meby-rosa-claro)',
          maxWidth: 560,
          flexWrap: 'wrap',
        }}
      >
        {TABS.map(tab => {
          const Icon = tab.icon;
          const ativo = abaAtiva === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setAbaAtiva(tab.id)}
              className="btn d-flex align-items-center gap-2 flex-grow-1"
              style={{
                backgroundColor: ativo ? '#ffffff' : 'transparent',
                color: ativo ? 'var(--meby-texto-escuro)' : 'var(--meby-rosa-seco)',
                fontWeight: ativo ? 600 : 400,
                fontSize: '0.875rem',
                border: 'none',
                borderRadius: '0.5rem',
                boxShadow: ativo ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.2s ease',
                minHeight: 40,
                justifyContent: 'center',
                padding: '0.4rem 1rem',
              }}
            >
              <Icon size={15} />
              <span className="d-none d-sm-inline">{tab.label}</span>
              <span className="d-sm-none">
                {tab.id === 'dados' ? 'Dados' : tab.id === 'senha' ? 'Senha' : 'Pedidos'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Conteúdo da aba */}
      <div
        className="p-3 p-md-4 rounded border"
        style={{
          backgroundColor: '#ffffff',
          borderColor: 'var(--meby-rosa-claro)',
        }}
      >
        {abaAtiva === 'dados'   && <TabDadosPessoais />}
        {abaAtiva === 'senha'   && <TabAlterarSenha />}
        {abaAtiva === 'pedidos' && <TabPedidos />}
      </div>
    </div>
  );
};

export default MinhaContaPage;