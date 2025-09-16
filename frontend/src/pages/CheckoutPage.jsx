import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const CheckoutPage = () => {
    const { cartItems, checkout } = useCart();
    const { user } = useAuth();
    const navigate = useNavigate();
    
    const [pedidoCriado, setPedidoCriado] = useState(null);
    const [loading, setLoading] = useState(false);

    const total = cartItems.reduce((sum, item) => sum + (item.preco * (item.quantity || 1)), 0);

    useEffect(() => {
        if (cartItems.length === 0 && !pedidoCriado) {
            toast.error("Seu carrinho está vazio. Adicione itens antes de finalizar a compra.");
            navigate('/');
        }
    }, [cartItems, pedidoCriado, navigate]);
    
    const handleConfirmarPedido = async () => {
        setLoading(true);
        try {
            // Esta função já chama nosso novo backend
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
        // Agora usamos o campo `qr_code_copia_cola` vindo da API
        if (pedidoCriado?.qr_code_copia_cola) {
            navigator.clipboard.writeText(pedidoCriado.qr_code_copia_cola);
            toast.success('Código PIX copiado!');
        }
    };

    return (
        <div className="container my-5">
            <h1 className="mb-4">Finalizar Pedido</h1>
            <div className="row g-5">
                {/* Coluna de Resumo do Pedido (sem alterações) */}
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

                {/* Coluna de Pagamento (COM AS MUDANÇAS) */}
                <div className="col-md-5">
                    <div className="card">
                        <div className="card-header">
                            <h4>Pagamento via PIX</h4>
                        </div>
                        <div className="card-body text-center">
                            {pedidoCriado ? (
                                <div>
                                    <h5>Pague para confirmar seu pedido</h5>
                                    <p>Aponte a câmera do seu celular ou use o "Copia e Cola".</p>
                                    <div className="my-3 d-flex justify-content-center">
                                        {/* MUDANÇA 1: Exibimos a imagem do QR Code em Base64 */}
                                        {pedidoCriado.qr_code_base64 && (
                                            <img 
                                                src={`data:image/jpeg;base64,${pedidoCriado.qr_code_base64}`}
                                                alt="QR Code PIX"
                                                style={{width: '220px', height: '220px'}}
                                            />
                                        )}
                                    </div>
                                    <div className="input-group">
                                        {/* MUDANÇA 2: Usamos o novo campo para o Copia e Cola */}
                                        <input type="text" className="form-control" value={pedidoCriado.qr_code_copia_cola || ''} readOnly />
                                        <button className="btn btn-outline-secondary" onClick={copiarCodigoPix}>Copiar</button>
                                    </div>
                                    <Link to="/minha-conta" className="btn btn-secondary w-100 mt-3">Ver Meus Pedidos</Link>
                                </div>
                            ) : (
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