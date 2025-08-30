import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react'; // CORREÇÃO: Importação nomeada
import toast from 'react-hot-toast';

const CheckoutPage = () => {
    const { cartItems, checkout } = useCart();
    const { user } = useAuth();
    const navigate = useNavigate();
    
    const [pedidoCriado, setPedidoCriado] = useState(null);
    const [loading, setLoading] = useState(false);

    const total = cartItems.reduce((sum, item) => sum + (item.preco * (item.quantity || 1)), 0);

    // Se o carrinho estiver vazio e nenhum pedido tiver sido criado ainda, volta para a home.
    useEffect(() => {
        if (cartItems.length === 0 && !pedidoCriado) {
            toast.error("Seu carrinho está vazio. Adicione itens antes de finalizar a compra.");
            navigate('/');
        }
    }, [cartItems, pedidoCriado, navigate]);
    
    const handleConfirmarPedido = async () => {
        setLoading(true);
        try {
            const pedido = await checkout();
            if (pedido) {
                setPedidoCriado(pedido);
                toast.success('Pedido confirmado! Pague com PIX para finalizar.');
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };
    
    const copiarCodigoPix = () => {
        if (pedidoCriado?.chave_pix) {
            navigator.clipboard.writeText(pedidoCriado.chave_pix);
            toast.success('Código PIX copiado!');
        }
    };

    return (
        <div className="container my-5">
            <h1 className="mb-4">Finalizar Pedido</h1>
            <div className="row g-5">
                {/* Coluna de Resumo do Pedido */}
                <div className="col-md-7">
                    <div className="card">
                        <div className="card-header">
                            <h4>Resumo da Compra</h4>
                        </div>
                        <ul className="list-group list-group-flush">
                            {cartItems.map(item => (
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
                                <span>R$ {total.toFixed(2)}</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Coluna de Pagamento */}
                <div className="col-md-5">
                    <div className="card">
                        <div className="card-header">
                            <h4>Pagamento</h4>
                        </div>
                        <div className="card-body text-center">
                            {pedidoCriado ? (
                                // Se o pedido já foi criado, mostra o PIX
                                <div>
                                    <h5>Pague com PIX para confirmar</h5>
                                    <p>Aponte a câmera do seu celular para o QR Code abaixo ou use o código "Copia e Cola".</p>
                                    <div className="my-3 d-flex justify-content-center">
                                        {/* CORREÇÃO: Usando o componente importado corretamente */}
                                        <QRCodeSVG value={pedidoCriado.chave_pix || ''} size={220} />
                                    </div>
                                    <div className="input-group">
                                        <input type="text" className="form-control" value={pedidoCriado.chave_pix} readOnly />
                                        <button className="btn btn-outline-secondary" onClick={copiarCodigoPix}>Copiar</button>
                                    </div>
                                    <Link to="/minha-conta" className="btn btn-secondary w-100 mt-3">Ver Meus Pedidos</Link>
                                </div>
                            ) : (
                                // Se o pedido ainda não foi criado, mostra o botão para confirmar
                                <div>
                                    <p>Confirme seu pedido para gerar o código PIX para pagamento.</p>
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