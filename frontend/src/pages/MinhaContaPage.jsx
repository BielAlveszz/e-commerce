import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Whatsapp } from 'react-bootstrap-icons';
import toast from 'react-hot-toast';

// --- COMPONENTE DO MODAL DO PIX (sem alterações) ---
const PixModal = ({ pedido, onClose }) => {
    const copiarCodigoPix = () => {
        navigator.clipboard.writeText(pedido.pix_copia_cola);
        toast.success('Código PIX copiado!');
    };

    return (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Pagar Pedido #{pedido.id}</h5>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>
                    <div className="modal-body text-center">
                        <p>Aponte a câmera do seu celular para o QR Code ou use o "Copia e Cola".</p>
                        <img 
                            src={`data:image/jpeg;base64,${pedido.pix_qrcode_base64}`}
                            alt="QR Code PIX"
                            className="img-fluid my-3"
                            style={{width: '250px', height: '250px'}}
                        />
                        <div className="input-group">
                            <input type="text" className="form-control" value={pedido.pix_copia_cola} readOnly />
                            <button className="btn btn-outline-secondary" onClick={copiarCodigoPix}>Copiar</button>
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

// --- COMPONENTE DOS DETALHES DO PEDIDO (COM A LÓGICA DO WHATSAPP CORRIGIDA) ---
const OrderDetails = ({ pedido, token }) => {
    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`http://localhost:3001/api/pedidos/detalhes/${pedido.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => setDetails(data))
        .finally(() => setLoading(false));
    }, [pedido.id, token]);

    // AQUI ESTÁ A CORREÇÃO: A lógica da função foi preenchida
    const handleWhatsAppRedirect = () => {
        if (!details) return;

        const numeroVendedora = process.env.REACT_APP_WHATSAPP_NUMBER;
        const total = parseFloat(details.pedido.valor_total).toFixed(2);
        
        const listaDeProdutos = details.itens.map(item => 
            `- ${item.quantidade}x ${item.nome}`
        ).join('\n');

        const mensagem = `Olá! Gostaria de combinar a entrega do meu pedido #${details.pedido.id}.\n\n*Resumo do Pedido:*\n${listaDeProdutos}\n\n*Total: R$ ${total}*\n\nAguardo seu contato!`;
        
        const mensagemCodificada = encodeURIComponent(mensagem);
        const url = `https://wa.me/${numeroVendedora}?text=${mensagemCodificada}`;
        window.open(url, '_blank');
    };

    if (loading) return <p className="p-3">Carregando detalhes...</p>;
    if (!details) return <p className="p-3 text-danger">Não foi possível carregar os detalhes.</p>;

    return (
        <div className="p-3 bg-light">
            <h6>Itens do Pedido:</h6>
            <ul className="list-unstyled mb-4">
                {details.itens.map((item, index) => (
                    <li key={index} className="d-flex align-items-center mb-2">
                        <img src={`http://localhost:3001/images/${item.url_imagem}`} alt={item.nome} className="img-thumbnail me-3" style={{ width: '50px', height: '50px', objectFit: 'cover' }} />
                        <div>
                            {item.nome}
                            <br />
                            <small className="text-muted">{item.quantidade} x R$ {parseFloat(item.preco_no_momento_da_compra).toFixed(2)}</small>
                        </div>
                    </li>
                ))}
            </ul>
            {pedido.status === 'pago' && (
                <button className="btn btn-success w-100" onClick={handleWhatsAppRedirect}>
                    <Whatsapp className="me-2" /> Combinar Entrega via WhatsApp
                </button>
            )}
        </div>
    );
};


const MinhaContaPage = () => {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const { token, user } = useAuth();
  
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [pedidoParaPagar, setPedidoParaPagar] = useState(null);

  useEffect(() => {
    fetch('http://localhost:3001/api/pedidos/meus-pedidos', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => setPedidos(data))
    .finally(() => setLoading(false));
  }, [token]);

  const toggleDetails = (pedidoId) => {
    setExpandedOrderId(prevId => (prevId === pedidoId ? null : pedidoId));
  };

  if (loading) return <div className="container text-center my-5"><h2>Carregando...</h2></div>;

  return (
    <div className="container my-5">
      {pedidoParaPagar && <PixModal pedido={pedidoParaPagar} onClose={() => setPedidoParaPagar(null)} />}

      <h1 className="mb-4">Minha Conta</h1>
      {user && <p className="lead">Olá, {user.nome}! Bem-vindo(a) de volta.</p>}

      <h2 className="mt-5 mb-4">Seu Histórico de Pedidos</h2>
      {pedidos.length === 0 ? (
        <p>Você ainda não fez nenhum pedido.</p>
      ) : (
        <div className="accordion" id="accordionPedidos">
          {pedidos.map(pedido => (
            <div key={pedido.id} className="accordion-item">
              <h2 className="accordion-header">
                <div className="d-flex align-items-center p-2">
                  <button 
                    className={`accordion-button ${expandedOrderId === pedido.id ? '' : 'collapsed'}`} 
                    type="button" 
                    onClick={() => toggleDetails(pedido.id)}
                  >
                    <div className="d-flex w-100 justify-content-between align-items-center">
                      <span className="fw-bold">Pedido #{pedido.id}</span>
                      <span>R$ {parseFloat(pedido.valor_total).toFixed(2)}</span>
                      <span className={`text-capitalize badge ${pedido.status === 'pago' ? 'bg-success' : 'bg-warning text-dark'}`}>{pedido.status.replace('_', ' ')}</span>
                      <small>{new Date(pedido.criado_em).toLocaleDateString('pt-BR')}</small>
                    </div>
                  </button>
                  {pedido.status === 'pagamento_pendente' && (
                    <button className="btn btn-primary btn-sm ms-3 flex-shrink-0" onClick={() => setPedidoParaPagar(pedido)}>
                        Pagar Agora
                    </button>
                  )}
                </div>
              </h2>
              <div className={`accordion-collapse collapse ${expandedOrderId === pedido.id ? 'show' : ''}`}>
                <div className="accordion-body">
                  {expandedOrderId === pedido.id && (
                    <OrderDetails pedido={pedido} token={token} />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MinhaContaPage;