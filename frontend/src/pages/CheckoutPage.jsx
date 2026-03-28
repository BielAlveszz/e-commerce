import React, { useState, useEffect, useRef } from 'react';
import { useCart, precoEfetivo } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Whatsapp, CheckCircleFill, TagFill } from 'react-bootstrap-icons';
import { WHATSAPP_NUMBER, apiFetch } from '../services/Api';

const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS  = 30 * 60 * 1000;

const CheckoutPage = () => {
  const { cartItems, checkout } = useCart();
  const { user }    = useAuth();
  const navigate    = useNavigate();

  const [pedidoCriado, setPedidoCriado]   = useState(null);
  const [itensDoPedido, setItensDoPedido] = useState([]);
  const [loading, setLoading]             = useState(false);
  const [pago, setPago]                   = useState(false);

  // Cupom
  const [codigoCupom, setCodigoCupom]         = useState('');
  const [cupomAplicado, setCupomAplicado]      = useState(null); // { codigo, tipo, valor, desconto }
  const [cupomLoading, setCupomLoading]        = useState(false);
  const [cupomErro, setCupomErro]             = useState('');

  const pollRef      = useRef(null);
  const pollStart    = useRef(null);
  const submetendoRef = useRef(false); // impede duplo clique / dupla submissão

  const subtotal = cartItems.reduce((sum, item) => sum + precoEfetivo(item) * (item.quantity || 1), 0);
  const desconto = cupomAplicado?.desconto || 0;
  const total    = pedidoCriado
    ? parseFloat(pedidoCriado.valor_total).toFixed(2)
    : Math.max(0, subtotal - desconto).toFixed(2);

  useEffect(() => {
    if (cartItems.length === 0 && !pedidoCriado) {
      toast.error('Seu carrinho está vazio.');
      navigate('/');
    }
  }, [cartItems, pedidoCriado, navigate]);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const iniciarPolling = (pedidoId) => {
    pollStart.current = Date.now();
    pollRef.current = setInterval(async () => {
      if (Date.now() - pollStart.current > POLL_TIMEOUT_MS) {
        clearInterval(pollRef.current);
        return;
      }
      try {
        const res  = await apiFetch(`/api/pedidos/detalhes/${pedidoId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data?.pedido?.status === 'pago') {
          clearInterval(pollRef.current);
          setPago(true);
          toast.success('Pagamento confirmado! 🎉', { duration: 6000 });
        }
      } catch (_) {}
    }, POLL_INTERVAL_MS);
  };

  const handleValidarCupom = async () => {
    if (!codigoCupom.trim()) return;
    setCupomLoading(true);
    setCupomErro('');
    try {
      const res  = await apiFetch('/api/cupons/validar', {
        method: 'POST',
        body: JSON.stringify({ codigo: codigoCupom, valorCarrinho: subtotal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setCupomAplicado(data.cupom);
      toast.success(`Cupom aplicado! Desconto de R$ ${data.cupom.desconto.toFixed(2)}`);
    } catch (err) {
      setCupomErro(err.message);
      setCupomAplicado(null);
    } finally {
      setCupomLoading(false);
    }
  };

  const handleRemoverCupom = () => {
    setCupomAplicado(null);
    setCodigoCupom('');
    setCupomErro('');
  };

  const handleConfirmarPedido = async () => {
    // Impede dupla submissão — se já está processando, ignora
    if (submetendoRef.current || loading) return;
    submetendoRef.current = true;
    setLoading(true);
    try {
      const { pedido, cartItems: items } = await checkout(cupomAplicado?.codigo || null);
      if (pedido) {
        setPedidoCriado(pedido);
        setItensDoPedido(items);
        toast.success('Pedido criado! Aguardando pagamento PIX.');
        iniciarPolling(pedido.id);
      }
    } catch (error) {
      toast.error(error.message);
      submetendoRef.current = false; // libera só em erro — em sucesso o botão some
    } finally {
      setLoading(false);
    }
  };

  const copiarCodigoPix = () => {
    if (pedidoCriado?.qr_code_copia_cola) {
      navigator.clipboard.writeText(pedidoCriado.qr_code_copia_cola);
      toast.success('Código PIX copiado!');
    }
  };

  const handleWhatsAppRedirect = () => {
    if (!pedidoCriado || itensDoPedido.length === 0) return;
    if (!WHATSAPP_NUMBER) { toast.error('Número do WhatsApp não configurado.'); return; }
    const lista    = itensDoPedido.map(i => `- ${i.quantity}x ${i.nome}`).join('\n');
    const mensagem = `Olá! Gostaria de combinar a entrega do meu pedido #${pedidoCriado.id}.\n\n*Resumo:*\n${lista}\n\n*Total: R$ ${total}*`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensagem)}`, '_blank');
  };

  return (
    <div className="container my-5">
      <h1 className="mb-4">Finalizar Pedido</h1>
      <div className="row g-4 justify-content-center">

        {/* Resumo */}
        <div className="col-12 col-md-7 col-lg-6">
          <div className="card">
            <div className="card-header"><h4 className="mb-0">Resumo da Compra</h4></div>
            <ul className="list-group list-group-flush">
              {(itensDoPedido.length > 0 ? itensDoPedido : cartItems).map(item => (
                <li key={item.id} className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="my-0">{item.nome}</h6>
                    <small className="text-muted">Quantidade: {item.quantity}</small>
                  </div>
                  <span className="text-muted">
                    R$ {(precoEfetivo(item) * item.quantity).toFixed(2)}
                  </span>
                </li>
              ))}

              {/* Linha de subtotal */}
              {desconto > 0 && (
                <>
                  <li className="list-group-item d-flex justify-content-between text-muted">
                    <span>Subtotal</span>
                    <span>R$ {subtotal.toFixed(2)}</span>
                  </li>
                  <li className="list-group-item d-flex justify-content-between"
                    style={{ color: '#198754' }}>
                    <span className="d-flex align-items-center gap-1">
                      <TagFill size={14} /> Cupom {cupomAplicado?.codigo}
                    </span>
                    <span>− R$ {desconto.toFixed(2)}</span>
                  </li>
                </>
              )}

              <li className="list-group-item d-flex justify-content-between fw-bold fs-5">
                <span>Total</span>
                <span>R$ {total}</span>
              </li>
            </ul>
          </div>

          {/* Campo de cupom — só antes de confirmar */}
          {!pedidoCriado && (
            <div className="card mt-3">
              <div className="card-body">
                <label className="form-label fw-bold" style={{ fontSize: '0.9rem' }}>
                  <TagFill className="me-1" style={{ color: 'var(--meby-rosa-seco)' }} />
                  Cupom de desconto
                </label>

                {cupomAplicado ? (
                  <div className="d-flex align-items-center justify-content-between p-2 rounded"
                    style={{ background: '#d4edda', border: '1px solid #c3e6cb' }}>
                    <span style={{ color: '#155724', fontWeight: 600 }}>
                      ✓ {cupomAplicado.codigo} — −R$ {desconto.toFixed(2)}
                    </span>
                    <button className="btn btn-sm btn-link text-danger p-0" onClick={handleRemoverCupom}>
                      Remover
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="input-group">
                      <input
                        type="text"
                        className={`form-control ${cupomErro ? 'is-invalid' : ''}`}
                        placeholder="Ex: BEMVINDA10"
                        value={codigoCupom}
                        onChange={e => { setCodigoCupom(e.target.value.toUpperCase()); setCupomErro(''); }}
                        onKeyDown={e => e.key === 'Enter' && handleValidarCupom()}
                        disabled={cupomLoading}
                      />
                      <button className="btn btn-outline-custom" onClick={handleValidarCupom}
                        disabled={cupomLoading || !codigoCupom.trim()}>
                        {cupomLoading
                          ? <span className="spinner-border spinner-border-sm" />
                          : 'Aplicar'
                        }
                      </button>
                    </div>
                    {cupomErro && <div className="text-danger mt-1" style={{ fontSize: '0.85rem' }}>{cupomErro}</div>}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Painel de pagamento */}
        <div className="col-12 col-md-5">
          <div className="card">
            <div className="card-header"><h4 className="mb-0">Pagamento</h4></div>
            <div className="card-body text-center">

              {pago ? (
                <div className="py-3">
                  <CheckCircleFill size={64} style={{ color: '#198754' }} className="mb-3" />
                  <h4 className="mb-2">Pagamento confirmado!</h4>
                  <p className="text-muted mb-4">Pedido #{pedidoCriado?.id} pago com sucesso.</p>
                  <button className="btn btn-success w-100 mb-2" onClick={handleWhatsAppRedirect}>
                    <Whatsapp className="me-2" /> Combinar Entrega via WhatsApp
                  </button>
                  <Link to="/minha-conta" className="btn btn-outline-custom w-100">Ver Meus Pedidos</Link>
                </div>

              ) : pedidoCriado ? (
                <div>
                  <h5 className="mb-1">Pague com PIX</h5>
                  <p className="text-muted small mb-2">
                    Verificando automaticamente…
                    <span className="spinner-border spinner-border-sm ms-2"
                      style={{ color: 'var(--meby-rosa-seco)' }} />
                  </p>
                  {pedidoCriado.qr_code_base64 && (
                    <img src={`data:image/jpeg;base64,${pedidoCriado.qr_code_base64}`}
                      alt="QR Code PIX" className="checkout-qrcode my-2"
                      style={{ width: 210, height: 210 }} />
                  )}
                  <div className="input-group mb-3">
                    <input type="text" className="form-control form-control-sm"
                      value={pedidoCriado.qr_code_copia_cola || ''} readOnly />
                    <button className="btn btn-outline-secondary btn-sm" onClick={copiarCodigoPix}>
                      Copiar
                    </button>
                  </div>
                  <hr />
                  <h6 className="mt-3">Após o pagamento, combine a entrega:</h6>
                  <button className="btn btn-success w-100 mt-2" onClick={handleWhatsAppRedirect}>
                    <Whatsapp className="me-2" /> Combinar via WhatsApp
                  </button>
                  <Link to="/minha-conta" className="btn btn-light w-100 mt-2">Ver Meus Pedidos</Link>
                </div>

              ) : (
                <div>
                  <p className="text-muted">Confirme para gerar o PIX.</p>
                  <p><strong>Comprando como:</strong> {user?.nome}</p>
                  {desconto > 0 && (
                    <div className="alert alert-success py-2 mb-3" style={{ fontSize: '0.875rem' }}>
                      Desconto de R$ {desconto.toFixed(2)} aplicado 🎉
                    </div>
                  )}
                  <button className="btn btn-dark-custom btn-lg w-100"
                    onClick={handleConfirmarPedido} disabled={loading}>
                    {loading
                      ? <><span className="spinner-border spinner-border-sm me-2"></span>Processando, aguarde...</>
                      : `Confirmar e Gerar PIX — R$ ${total}`
                    }
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;