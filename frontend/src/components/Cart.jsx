import React from 'react';
import { useCart, precoEfetivo } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { XLg, PlusLg, DashLg } from 'react-bootstrap-icons';
import { API_URL } from '../services/Api';
import toast from 'react-hot-toast';

const Cart = () => {
    const { isCartOpen, setIsCartOpen, cartItems, cartLoading, updateQuantity, removeFromCart } = useCart();
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();

    const total = cartItems.reduce((sum, item) => sum + precoEfetivo(item) * (item.quantity || 1), 0);

    const handleCheckoutClick = () => {
        setIsCartOpen(false);
        navigate(isAuthenticated ? '/checkout' : '/login');
    };

    const handleUpdateQuantity = async (item, delta) => {
        const novaQtd = (item.quantity || 1) + delta;
        // Bloqueia antes de chamar a API
        if (novaQtd > item.quantidade_estoque) {
            toast.error(`Estoque máximo: ${item.quantidade_estoque} unidades.`);
            return;
        }
        try {
            await updateQuantity(item.id, novaQtd);
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleRemove = async (id) => {
        try { await removeFromCart(id); }
        catch (err) { toast.error(err.message); }
    };

    if (!isCartOpen) return null;

    return (
        <>
            <div className="cart-backdrop is-open" onClick={() => setIsCartOpen(false)} />
            <div className="cart-offcanvas is-open" onClick={e => e.stopPropagation()}>
                <div className="offcanvas-header border-bottom" style={{ borderColor: 'var(--meby-rosa-claro)' }}>
                    <h5 className="offcanvas-title" style={{ color: 'var(--meby-texto-escuro)' }}>
                        Seu Carrinho
                    </h5>
                    <button type="button" className="btn-close" onClick={() => setIsCartOpen(false)} />
                </div>

                <div className="offcanvas-body d-flex flex-column">
                    {cartLoading ? (
                        <div className="flex-grow-1 d-flex align-items-center justify-content-center">
                            <div className="spinner-border text-secondary" role="status" />
                        </div>
                    ) : cartItems.length === 0 ? (
                        <div className="flex-grow-1 d-flex align-items-center justify-content-center">
                            <p className="text-muted">Seu carrinho está vazio.</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex-grow-1 p-3" style={{ overflowY: 'auto' }}>
                                {cartItems.map(item => {
                                    const preco     = precoEfetivo(item);
                                    const temOferta = item.preco_promocional && parseFloat(item.preco_promocional) > 0;
                                    const qty       = item.quantity || 1;
                                    const maxQtd    = item.quantidade_estoque;
                                    const noMaximo  = qty >= maxQtd;

                                    return (
                                        <div key={item.id} className="d-flex align-items-center gap-3 mb-4">
                                            <img src={`${API_URL}/images/${item.url_imagem}`} alt={item.nome}
                                                style={{ width: 64, height: 64, objectFit: 'cover' }}
                                                className="rounded flex-shrink-0" />

                                            <div className="flex-grow-1 min-w-0">
                                                <p className="fw-semibold mb-0 text-truncate">{item.nome}</p>
                                                <div className="d-flex align-items-center gap-1">
                                                    {temOferta && (
                                                        <span className="text-muted small text-decoration-line-through">
                                                            R$ {parseFloat(item.preco).toFixed(2)}
                                                        </span>
                                                    )}
                                                    <span className="text-muted small">
                                                        R$ {preco.toFixed(2)}
                                                    </span>
                                                </div>
                                                {/* Aviso de estoque baixo */}
                                                {noMaximo && (
                                                    <small style={{ color: 'var(--bs-danger)', fontSize: '0.75rem' }}>
                                                        Limite de estoque atingido
                                                    </small>
                                                )}
                                                {!noMaximo && maxQtd <= 5 && (
                                                    <small style={{ color: 'var(--bs-warning)', fontSize: '0.75rem' }}>
                                                        Restam apenas {maxQtd - qty} no estoque
                                                    </small>
                                                )}
                                            </div>

                                            {/* Controle de quantidade */}
                                            <div className="d-flex align-items-center gap-1 rounded p-1 flex-shrink-0"
                                                style={{ border: '1px solid var(--meby-rosa-claro)' }}>
                                                <button className="btn btn-sm p-1"
                                                    style={{ backgroundColor: 'var(--meby-rosa-claro)', color: 'var(--meby-texto-escuro)' }}
                                                    onClick={() => handleUpdateQuantity(item, -1)}>
                                                    <DashLg size={14} />
                                                </button>
                                                <span className="fw-bold px-1" style={{ minWidth: 20, textAlign: 'center' }}>
                                                    {qty}
                                                </span>
                                                {/* Botão + desabilitado quando atingir o estoque */}
                                                <button className="btn btn-sm p-1"
                                                    style={{ backgroundColor: 'var(--meby-rosa-claro)', color: 'var(--meby-texto-escuro)' }}
                                                    disabled={noMaximo}
                                                    title={noMaximo ? `Estoque máximo: ${maxQtd}` : ''}
                                                    onClick={() => handleUpdateQuantity(item, +1)}>
                                                    <PlusLg size={14} />
                                                </button>
                                            </div>

                                            <button className="btn btn-sm flex-shrink-0"
                                                style={{ borderColor: 'var(--meby-rosa-seco)', color: 'var(--meby-rosa-seco)' }}
                                                onClick={() => handleRemove(item.id)}>
                                                <XLg size={14} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="border-top p-3" style={{ backgroundColor: 'var(--meby-rosa-claro)' }}>
                                <div className="d-flex justify-content-between fs-5 fw-bold mb-3"
                                    style={{ color: 'var(--meby-texto-escuro)' }}>
                                    <span>Total:</span>
                                    <span>R$ {total.toFixed(2)}</span>
                                </div>
                                <div className="d-grid">
                                    <button onClick={handleCheckoutClick} className="btn btn-dark-custom btn-lg">
                                        {isAuthenticated ? 'Ir para o Pagamento' : 'Fazer Login para Continuar'}
                                    </button>
                                </div>
                                {!isAuthenticated && (
                                    <div className="text-center mt-2">
                                        <small>
                                            Para finalizar,{' '}
                                            <Link to="/cadastro" onClick={() => setIsCartOpen(false)}>crie uma conta</Link>
                                            {' '}ou faça o login.
                                        </small>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
};

export default Cart;