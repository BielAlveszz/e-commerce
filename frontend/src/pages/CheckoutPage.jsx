import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Whatsapp } from 'react-bootstrap-icons'; // Ícone do WhatsApp

const CheckoutPage = () => {
    const { cartItems, checkout } = useCart();
    const { user } = useAuth();
    const navigate = useNavigate();
    
    const [pedidoCriado, setPedidoCriado] = useState(null);
    const [itensDoPedido, setItensDoPedido] = useState([]); // Novo estado para guardar os itens do pedido finalizado
    const [loading, setLoading] = useState(false);

    // O total agora é pego do pedido criado para garantir consistência
    const total = pedidoCriado ? parseFloat(pedidoCriado.valor_total).toFixed(2) : (cartItems.reduce((sum, item) => sum + (item.preco * (item.quantity || 1)), 0)).toFixed(2);

    useEffect(() => {
        // A verificação agora é mais simples
        if (cartItems.length === 0 && !pedidoCriado) {
            toast.error("Seu carrinho está vazio.");
            navigate('/');
        }
    }, [cartItems, pedidoCriado, navigate]);
    
    const handleConfirmarPedido = async () => {
        setLoading(true);
        try {
            // A função checkout agora retorna tanto o pedido quanto os itens que estavam no carrinho
            const { pedido, cartItems: items } = await checkout(); 
            if (pedido) {
                setPedidoCriado(pedido);
                setItensDoPedido(items); // Guarda os itens do pedido no estado
                toast.success('Pedido confirmado! Pague com PIX para finalizar.');
            }
        } catch (error) {
            toast.error(error.message);
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

    // Função que gera a mensagem completa e redireciona para o WhatsApp
    const handleWhatsAppRedirect = () => {
        if (!pedidoCriado || itensDoPedido.length === 0) return;

        const numeroVendedora = process.env.REACT_APP_WHATSAPP_NUMBER;
        
        const listaDeProdutos = itensDoPedido.map(item => 
            `- ${item.quantity}x ${item.nome}`
        ).join('\n');

        const mensagem = `Olá! Gostaria de combinar a entrega do meu pedido #${pedidoCriado.id}.\n\n*Resumo do Pedido:*\n${listaDeProdutos}\n\n*Total: R$ ${total}*\n\nAguardo seu contato!`;
        
        const mensagemCodificada = encodeURIComponent(mensagem);
        const url = `https://wa.me/${numeroVendedora}?text=${mensagemCodificada}`;
        window.open(url, '_blank');
    };

    return (
        <div className="container my-5">
            <h1 className="mb-4">Finalizar Pedido</h1>
            <div className="row g-5 justify-content-center">
                <div className="col-md-7 col-lg-6">
                    <div className="card">
                        <div className="card-header">
                            <h4>Resumo da Compra</h4>
                        </div>
                        <ul className="list-group list-group-flush">
                            {(itensDoPedido.length > 0 ? itensDoPedido : cartItems).map(item => (
                                <li key={item.id} className="list-group-item d-flex justify-content-between align-items-center">
                                    <div>
                                        <h6 className="my-0">{item.nome}</h6>
                                        <small className="text-muted">Quantidade: {item.quantity}</small>
                                    </div>
                                    <span className="text-muted">R$ {(item.preco * item.quantity).toFixed(2)}</span>
                                </li>
                            ))}
                            <li className="list-group-item d-flex justify-content-between fw-bold fs-5">
                                <span>Total</span>
                                <span>R$ {total}</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="col-md-5 col-lg-5">
                    <div className="card">
                        <div className="card-header">
                            <h4>Pagamento e Entrega</h4>
                        </div>
                        <div className="card-body text-center">
                            {pedidoCriado ? (
                                <div>
                                    <h5 className="mb-3">1. Pague com PIX para confirmar</h5>
                                    <div className="my-3 d-flex justify-content-center">
                                        {pedidoCriado.qr_code_base64 && (
                                            <img 
                                                src={`data:image/jpeg;base64,${pedidoCriado.qr_code_base64}`}
                                                alt="QR Code PIX"
                                                style={{width: '220px', height: '220px'}}
                                            />
                                        )}
                                    </div>
                                    <div className="input-group mb-3">
                                        <input type="text" className="form-control" value={pedidoCriado.qr_code_copia_cola || ''} readOnly />
                                        <button className="btn btn-outline-secondary" onClick={copiarCodigoPix}>Copiar</button>
                                    </div>
                                    
                                    <hr />

                                    <h5 className="mt-4">2. Combine a Entrega</h5>
                                    <p className="small text-muted">Após o pagamento, clique abaixo para falar com a vendedora e combinar a entrega.</p>
                                    <button className="btn btn-success w-100" onClick={handleWhatsAppRedirect}>
                                        <Whatsapp className="me-2" /> Combinar Entrega via WhatsApp
                                    </button>

                                    <Link to="/minha-conta" className="btn btn-light w-100 mt-3">Ver Histórico de Pedidos</Link>
                                </div>
                            ) : (
                                <div>
                                    <p>Confirme seu pedido para gerar o código PIX e combinar a entrega.</p>
                                    <p><strong>Comprando como:</strong> {user?.nome}</p>
                                    <div className="d-grid">
                                        <button 
                                            className="btn btn-primary btn-lg" 
                                            onClick={handleConfirmarPedido}
                                            disabled={loading}
                                        >
                                            {loading ? 'Confirmando...' : 'Confirmar Pedido e Gerar PIX'}
                                        </button>
                                    </div>
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