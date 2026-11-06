import React, { useState, useEffect, useRef } from 'react';
import { useCart, precoEfetivo } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Whatsapp, CheckCircleFill, TagFill, GeoAltFill, PlusCircle, CreditCard, UiChecksGrid, HouseDoorFill, PinMapFill } from 'react-bootstrap-icons';
import { WHATSAPP_NUMBER, API_URL, apiFetch } from '../services/Api';

// ─────────────────────────────────────────────────────────────────
// SDK do Mercado Pago (Frontend). No Vite as variáveis usam import.meta.env.VITE_*
// ─────────────────────────────────────────────────────────────────
import { initMercadoPago, Payment } from '@mercadopago/sdk-react';

initMercadoPago(import.meta.env.VITE_MP_PUBLIC_KEY || 'COLOQUE_A_SUA_CHAVE_PUBLICA_AQUI', { locale: 'pt-BR' });

const CheckoutPage = () => {
  const { cartItems, checkout } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [pedidoCriado, setPedidoCriado]   = useState(null);
  const [itensDoPedido, setItensDoPedido] = useState([]);
  const [loading, setLoading]             = useState(false);
  const [pago, setPago]                   = useState(false);

  // Alternância entre PIX e Cartão
  const [metodoPagamento, setMetodoPagamento] = useState('pix');

  // Cupom
  const [codigoCupom, setCodigoCupom]     = useState('');
  const [cupomAplicado, setCupomAplicado] = useState(null);
  const [cupomLoading, setCupomLoading]   = useState(false);
  const [cupomErro, setCupomErro]         = useState('');

  // Endereços (locais de entrega)
  const [enderecos, setEnderecos]                         = useState([]);
  const [enderecoSelecionadoId, setEnderecoSelecionadoId] = useState('');
  const [loadingEnderecos, setLoadingEnderecos]           = useState(true);
  const [showEndForm, setShowEndForm]                     = useState(false);
  const [novoEnd, setNovoEnd]     = useState({ apelido: '', tipo_entrega: 'casa', descricao_local: '' });
  const [salvandoEnd, setSalvandoEnd] = useState(false);

  const eventSourceRef = useRef(null);
  const submetendoRef  = useRef(false);

  const subtotal = cartItems.reduce((sum, item) => sum + precoEfetivo(item) * (item.quantity || 1), 0);
  const desconto = cupomAplicado?.desconto || 0;
  const total = pedidoCriado
    ? parseFloat(pedidoCriado.valor_total).toFixed(2)
    : Math.max(0, subtotal - desconto).toFixed(2);

  // Redireciona se o carrinho estiver vazio (e ainda não houver pedido criado)
  useEffect(() => {
    if (cartItems.length === 0 && !pedidoCriado) {
      toast.error('O seu carrinho está vazio.');
      navigate('/');
    }
  }, [cartItems, pedidoCriado, navigate]);

  // Busca os locais de entrega do cliente
  useEffect(() => {
    const fetchEnderecos = async () => {
      try {
        const res = await apiFetch('/api/enderecos');
        if (res.ok) {
          const data = await res.json();
          setEnderecos(data);
          if (data.length > 0) {
            const principal = data.find(e => e.principal) || data[0];
            setEnderecoSelecionadoId(principal.id);
          } else {
            setShowEndForm(true);
          }
        }
      } catch (e) {
        console.error('Erro ao buscar endereços', e);
      } finally {
        setLoadingEnderecos(false);
      }
    };
    fetchEnderecos();
  }, []);

  // Fecha a conexão SSE ao desmontar
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) eventSourceRef.current.close();
    };
  }, []);

  const iniciarEscutaPix = (pedidoId) => {
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const eventSource = new EventSource(`${baseURL}/api/pedidos/stream/${pedidoId}`, { withCredentials: true });

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.status === 'pago') {
        setPago(true);
        toast.success('Pagamento confirmado! 🎉', { duration: 6000 });
        eventSource.close();
      }
    };
    eventSource.onerror = () => console.error('Erro na ligação SSE, a tentar reconectar...');
    eventSourceRef.current = eventSource;
  };

  // ── Cupom ────────────────────────────────────────────────────────
  const handleValidarCupom = async () => {
    const codigo = codigoCupom.trim();
    if (!codigo) return;

    setCupomLoading(true);
    setCupomErro('');
    try {
      const res = await apiFetch('/api/cupons/validar', {
        method: 'POST',
        body: JSON.stringify({ codigo, valorCarrinho: subtotal }),
      });
      const data = await res.json();

      if (!res.ok) {
        setCupomAplicado(null);
        setCupomErro(data.message || 'Cupom inválido.');
        return;
      }

      setCupomAplicado(data.cupom);
      toast.success('Cupom aplicado!');
    } catch (e) {
      setCupomErro('Não foi possível validar o cupom. Tente novamente.');
    } finally {
      setCupomLoading(false);
    }
  };

  const handleRemoverCupom = () => {
    setCupomAplicado(null);
    setCodigoCupom('');
    setCupomErro('');
  };

  // ── Endereço novo ────────────────────────────────────────────────
  const handleSalvarEndereco = async (e) => {
    e.preventDefault();

    if (!novoEnd.apelido.trim()) return toast.error('Dê um nome para este local (Ex: Casa, Metrô Sé).');
    if (novoEnd.descricao_local.trim().length < 5) return toast.error('Descreva o endereço ou o ponto de encontro.');

    setSalvandoEnd(true);
    try {
      const res = await apiFetch('/api/enderecos', {
        method: 'POST',
        body: JSON.stringify(novoEnd),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || 'Erro ao salvar o local.');
        return;
      }

      const criado = data.endereco;
      setEnderecos(prev => [...prev, criado]);
      setEnderecoSelecionadoId(criado.id);
      setShowEndForm(false);
      setNovoEnd({ apelido: '', tipo_entrega: 'casa', descricao_local: '' });
      toast.success('Local adicionado!');
    } catch (err) {
      toast.error('Não foi possível salvar o local. Tente novamente.');
    } finally {
      setSalvandoEnd(false);
    }
  };

  // ── Confirmação do pedido (PIX ou Cartão) ────────────────────────
  const handleConfirmarPedido = async (metodo = 'pix', paymentFormData = null) => {
    if (!enderecoSelecionadoId) {
      return toast.error('Por favor, selecione ou adicione um local de entrega.');
    }

    if (submetendoRef.current || loading) return;
    submetendoRef.current = true;
    setLoading(true);

    try {
      // Enviamos cupom, método, dados do cartão E o local de entrega escolhido
      const { pedido, cartItems: items, statusPagamento } = await checkout(
        cupomAplicado?.codigo || null,
        metodo,
        paymentFormData,
        enderecoSelecionadoId
      );

      if (pedido) {
        setPedidoCriado(pedido);
        setItensDoPedido(items);

        if (metodo === 'pix') {
          toast.success('Pedido criado! A aguardar pagamento PIX.');
          iniciarEscutaPix(pedido.id);
        } else {
          if (statusPagamento === 'approved' || statusPagamento === 'pago') {
            setPago(true);
            toast.success('Pagamento com cartão aprovado com sucesso! 🎉');
          } else {
            toast.error('O pagamento está em análise ou foi recusado pela sua operadora.');
          }
        }
      }
    } catch (error) {
      toast.error(error.message);
      submetendoRef.current = false;
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

    const lista = itensDoPedido.map(i => `- ${i.quantity}x ${i.nome}`).join('\n');
    const endereco = enderecos.find(e => e.id === parseInt(enderecoSelecionadoId));
    const detalhesEntrega = endereco
      ? `\n*Localização escolhida:*\n📍 ${endereco.apelido} (${endereco.tipo_entrega === 'casa' ? 'Morada' : 'Ponto de Encontro'})\n📝 ${endereco.descricao_local}\n`
      : '';

    const mensagem = `Olá! Gostaria de combinar a entrega do meu pedido #${pedidoCriado.id}.\n\n*Resumo:*\n${lista}\n${detalhesEntrega}\n*Total Pago: R$ ${total}*`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensagem)}`, '_blank');
  };

  return (
    <div className="container my-5">
      <h1 className="mb-4">Finalizar Pedido</h1>
      <div className="row g-4 justify-content-center">

        {/* ───────────────────────── LADO ESQUERDO ───────────────────────── */}
        <div className="col-12 col-md-7 col-lg-6">

          {/* Card de Local de Entrega */}
          {!pedidoCriado && (
            <div className="card mb-4 shadow-sm border-0">
              <div className="card-header bg-white">
                <h5 className="mb-0"><GeoAltFill className="me-2 text-danger" /> Onde quer receber?</h5>
              </div>
              <div className="card-body">
                {loadingEnderecos ? (
                  <p className="text-muted small mb-0">Carregando locais…</p>
                ) : (
                  <>
                    {enderecos.map(end => (
                      <div
                        key={end.id}
                        className={`p-3 border rounded mb-2 ${enderecoSelecionadoId === end.id ? 'border-dark bg-light' : ''}`}
                        onClick={() => setEnderecoSelecionadoId(end.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="form-check m-0">
                          <input
                            className="form-check-input"
                            type="radio"
                            name="endereco"
                            checked={enderecoSelecionadoId === end.id}
                            onChange={() => setEnderecoSelecionadoId(end.id)}
                          />
                          <label className="form-check-label w-100 fw-bold">
                            {end.tipo_entrega === 'casa'
                              ? <HouseDoorFill className="me-1 text-muted" />
                              : <PinMapFill className="me-1 text-muted" />}
                            {end.apelido}
                          </label>
                          <small className="d-block text-muted ms-4">{end.descricao_local}</small>
                        </div>
                      </div>
                    ))}

                    {showEndForm ? (
                      <form onSubmit={handleSalvarEndereco} className="border rounded p-3 mt-2 bg-light">
                        <div className="mb-2">
                          <label className="form-label small fw-bold mb-1">Nome do local</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Ex: Casa, Trabalho, Metrô Sé"
                            value={novoEnd.apelido}
                            onChange={e => setNovoEnd({ ...novoEnd, apelido: e.target.value })}
                          />
                        </div>
                        <div className="mb-2">
                          <label className="form-label small fw-bold mb-1">Tipo</label>
                          <select
                            className="form-select form-select-sm"
                            value={novoEnd.tipo_entrega}
                            onChange={e => setNovoEnd({ ...novoEnd, tipo_entrega: e.target.value })}
                          >
                            <option value="casa">Endereço (casa/trabalho)</option>
                            <option value="ponto_encontro">Ponto de encontro</option>
                          </select>
                        </div>
                        <div className="mb-3">
                          <label className="form-label small fw-bold mb-1">Descrição</label>
                          <textarea
                            className="form-control form-control-sm"
                            rows={2}
                            placeholder="Rua, número, referência OU descreva o ponto de encontro"
                            value={novoEnd.descricao_local}
                            onChange={e => setNovoEnd({ ...novoEnd, descricao_local: e.target.value })}
                          />
                        </div>
                        <div className="d-flex gap-2">
                          <button type="submit" className="btn btn-dark btn-sm fw-bold" disabled={salvandoEnd}>
                            {salvandoEnd ? 'Salvando…' : 'Salvar local'}
                          </button>
                          {enderecos.length > 0 && (
                            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowEndForm(false)}>
                              Cancelar
                            </button>
                          )}
                        </div>
                      </form>
                    ) : (
                      <button type="button" className="btn btn-sm btn-outline-dark mt-2" onClick={() => setShowEndForm(true)}>
                        <PlusCircle className="me-1" /> Adicionar novo local
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Card de Resumo do Pedido */}
          <div className="card mb-4 shadow-sm border-0">
            <div className="card-header bg-white">
              <h5 className="mb-0">Resumo do pedido</h5>
            </div>
            <div className="card-body">
              {(pedidoCriado ? itensDoPedido : cartItems).map(item => (
                <div key={`${item.id}-${item.variante_id || 'base'}`} className="d-flex align-items-center mb-2">
                  {item.url_imagem && (
                    <img
                      src={`${API_URL}${item.url_imagem}`}
                      alt={item.nome}
                      style={{ width: 44, height: 44, objectFit: 'cover' }}
                      className="rounded me-2 border"
                    />
                  )}
                  <div className="flex-grow-1">
                    <div className="small fw-bold">{item.nome}</div>
                    <div className="text-muted small">{item.quantity} × R$ {precoEfetivo(item).toFixed(2)}</div>
                  </div>
                  <div className="fw-bold small">R$ {(precoEfetivo(item) * (item.quantity || 1)).toFixed(2)}</div>
                </div>
              ))}

              <hr />
              <div className="d-flex justify-content-between">
                <span>Subtotal</span>
                <span>R$ {subtotal.toFixed(2)}</span>
              </div>
              {desconto > 0 && (
                <div className="d-flex justify-content-between text-success">
                  <span>Desconto {cupomAplicado?.codigo ? `(${cupomAplicado.codigo})` : ''}</span>
                  <span>- R$ {Number(desconto).toFixed(2)}</span>
                </div>
              )}
              <div className="d-flex justify-content-between fs-5 fw-bold mt-1">
                <span>Total</span>
                <span>R$ {total}</span>
              </div>
            </div>
          </div>

          {/* Card de Cupom (some após o pedido ser criado) */}
          {!pedidoCriado && (
            <div className="card shadow-sm border-0">
              <div className="card-header bg-white">
                <h5 className="mb-0"><TagFill className="me-2 text-warning" /> Cupom de desconto</h5>
              </div>
              <div className="card-body">
                {!cupomAplicado ? (
                  <>
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control text-uppercase"
                        placeholder="Digite seu cupom"
                        value={codigoCupom}
                        onChange={e => setCodigoCupom(e.target.value.toUpperCase())}
                        onKeyDown={e => { if (e.key === 'Enter') handleValidarCupom(); }}
                        disabled={cupomLoading}
                      />
                      <button
                        className="btn btn-outline-dark fw-bold"
                        onClick={handleValidarCupom}
                        disabled={cupomLoading || !codigoCupom.trim()}
                      >
                        {cupomLoading ? '…' : 'Aplicar'}
                      </button>
                    </div>
                    {cupomErro && <div className="text-danger small mt-2">{cupomErro}</div>}
                  </>
                ) : (
                  <div className="d-flex justify-content-between align-items-center bg-light border rounded p-2">
                    <span className="small">
                      <TagFill className="text-success me-1" />
                      Cupom <strong>{cupomAplicado.codigo}</strong> aplicado
                      {' '}(- R$ {Number(cupomAplicado.desconto).toFixed(2)})
                    </span>
                    <button className="btn btn-sm btn-link text-danger p-0 text-decoration-none" onClick={handleRemoverCupom}>
                      Remover
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ───────────────────────── LADO DIREITO: PAGAMENTO ───────────────────────── */}
        <div className="col-12 col-md-5">
          <div className="card shadow-sm border-0" style={{ position: 'sticky', top: '20px' }}>
            <div className="card-header bg-dark text-white"><h5 className="mb-0">Pagamento</h5></div>
            <div className="card-body text-center">

              {pago ? (
                <div className="py-3">
                  <CheckCircleFill size={64} style={{ color: '#198754' }} className="mb-3" />
                  <h4 className="mb-2">Pagamento confirmado!</h4>
                  <p className="text-muted mb-4">Pedido #{pedidoCriado?.id} pago com sucesso.</p>
                  <button className="btn btn-success w-100 mb-2" onClick={handleWhatsAppRedirect}>
                    <Whatsapp className="me-2" /> Combinar Entrega via WhatsApp
                  </button>
                  <Link to="/minha-conta" className="btn btn-outline-dark w-100">Ver Meus Pedidos</Link>
                </div>

              ) : pedidoCriado && metodoPagamento === 'pix' ? (
                // ECRÃ DO PIX
                <div>
                  <h5 className="mb-1">Pague com PIX</h5>
                  {pedidoCriado.qr_code_base64 && (
                    <img
                      src={`data:image/jpeg;base64,${pedidoCriado.qr_code_base64}`}
                      alt="QR Code PIX"
                      className="my-2 border rounded p-1 shadow-sm"
                      style={{ width: 220, height: 220 }}
                    />
                  )}
                  <div className="input-group mb-3 mt-2">
                    <input type="text" className="form-control form-control-sm text-center font-monospace" value={pedidoCriado.qr_code_copia_cola || ''} readOnly />
                    <button className="btn btn-outline-secondary btn-sm fw-bold" onClick={copiarCodigoPix}>Copiar PIX</button>
                  </div>
                  <button className="btn btn-success w-100 mt-2 fw-bold" onClick={handleWhatsAppRedirect}>
                    <Whatsapp className="me-2" /> Combinar via WhatsApp
                  </button>
                </div>

              ) : (
                // ECRÃ DE ESCOLHA ANTES DE PAGAR
                <div className="text-start">
                  <p className="text-muted mb-3 text-center">Escolha a forma de pagamento.</p>

                  <div className="d-flex gap-2 mb-4">
                    <button
                      className={`btn w-50 fw-bold ${metodoPagamento === 'pix' ? 'btn-dark' : 'btn-outline-secondary'}`}
                      onClick={() => setMetodoPagamento('pix')}
                    >
                      <UiChecksGrid className="me-2" /> PIX
                    </button>
                    <button
                      className={`btn w-50 fw-bold ${metodoPagamento === 'cartao' ? 'btn-dark' : 'btn-outline-secondary'}`}
                      onClick={() => setMetodoPagamento('cartao')}
                    >
                      <CreditCard className="me-2" /> Cartão
                    </button>
                  </div>

                  {!enderecoSelecionadoId && (
                    <div className="alert alert-danger text-center small py-2 mb-3">
                      Selecione um local de entrega primeiro.
                    </div>
                  )}

                  {metodoPagamento === 'pix' ? (
                    <button
                      className="btn btn-dark btn-lg w-100 fw-bold mt-2"
                      onClick={() => handleConfirmarPedido('pix')}
                      disabled={loading || !enderecoSelecionadoId}
                    >
                      {loading ? 'A processar...' : `Confirmar e Gerar PIX — R$ ${total}`}
                    </button>
                  ) : (
                    <div className={!enderecoSelecionadoId ? 'opacity-50 pe-none' : ''}>
                      <Payment
                        initialization={{ amount: parseFloat(total) }}
                        customization={{
                          paymentMethods: {
                            creditCard: 'all',
                            debitCard: 'all',
                          },
                        }}
                        onSubmit={async (param) => {
                          await handleConfirmarPedido('cartao', param.formData);
                        }}
                      />
                    </div>
                  )}
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