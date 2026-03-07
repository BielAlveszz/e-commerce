import React from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { XLg, PlusLg, DashLg } from 'react-bootstrap-icons';

const Cart = () => {
  const { isCartOpen, setIsCartOpen, cartItems, updateQuantity, removeFromCart } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const total = cartItems.reduce((sum, item) => sum + (item.preco * (item.quantity || 1)), 0);

  const handleCheckoutClick = () => {
    if (isAuthenticated) {
      // Se está logado, fecha o carrinho e navega para a página de checkout
      setIsCartOpen(false);
      navigate('/checkout'); 
    } else {
      // Se não está logado, fecha o carrinho e leva para a página de login
      setIsCartOpen(false);
      navigate('/login');
    }
  };

  if (!isCartOpen) return null;

  return (
    <>
      <div 
        className="cart-backdrop is-open"
        onClick={() => setIsCartOpen(false)} 
      ></div>
      
      <div 
        className="cart-offcanvas is-open"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="offcanvas-header border-bottom" style={{ borderColor: 'var(--meby-rosa-claro)' }}>
          <h5 className="offcanvas-title" style={{ color: 'var(--meby-texto-escuro)' }}>Seu Carrinho</h5>
          <button type="button" className="btn-close" onClick={() => setIsCartOpen(false)}></button>
        </div>
        <div className="offcanvas-body d-flex flex-column">
          {cartItems.length === 0 ? (
            <div className="flex-grow-1 d-flex align-items-center justify-content-center">
              <p className="text-muted">Seu carrinho está vazio.</p>
            </div>
          ) : (
            <>
              <div className="flex-grow-1 p-3" style={{ overflowY: 'auto' }}>
                {cartItems.map(item => (
                  <div key={item.id} className="d-flex align-items-center gap-3 mb-4">
                    <img 
                     src={`http://localhost:3001/images/${item.url_imagem}`} 
                      alt={item.nome} 
                      style={{width: '64px', height: '64px', objectFit: 'cover'}} 
                      className="rounded" 
                    />
                    <div className="flex-grow-1">
                      <p className="fw-semibold mb-1">{item.nome}</p>
                      <p className="text-muted small">R$ {parseFloat(item.preco).toFixed(2)}</p>
                    </div>
                    <div className="d-flex align-items-center gap-2 rounded p-1" style={{ border: '1px solid var(--meby-rosa-claro)' }}>
                      <button className="btn btn-sm" style={{ backgroundColor: 'var(--meby-rosa-claro)', color: 'var(--meby-texto-escuro)' }} onClick={() => updateQuantity(item.id, item.quantity - 1)}><DashLg size={16}/></button>
                      <span className="fw-bold px-2" style={{ color: 'var(--meby-texto-escuro)' }}>{item.quantity}</span>
                      <button className="btn btn-sm" style={{ backgroundColor: 'var(--meby-rosa-claro)', color: 'var(--meby-texto-escuro)' }} onClick={() => updateQuantity(item.id, item.quantity + 1)}><PlusLg size={16}/></button>
                    </div>
                    <button className="btn btn-sm" style={{ borderColor: 'var(--meby-rosa-seco)', color: 'var(--meby-rosa-seco)' }} onClick={() => removeFromCart(item.id)}><XLg size={16}/></button>
                  </div>
                ))}
              </div>
              <div className="border-top p-3" style={{ backgroundColor: 'var(--meby-rosa-claro)', borderColor: 'var(--meby-rosa-claro)' }}>
                <div className="d-flex justify-content-between fs-5 fw-bold" style={{ color: 'var(--meby-texto-escuro)' }}>
                  <span>Total:</span>
                  <span>R$ {total.toFixed(2)}</span>
                </div>
                <div className="d-grid mt-3">
                  <button onClick={handleCheckoutClick} className="btn btn-dark-custom btn-lg">
                    {isAuthenticated ? 'Ir para o Pagamento' : 'Fazer Login para Continuar'}
                  </button>
                </div>
                {!isAuthenticated && (
                    <div className="text-center mt-2">
                        <small>Para finalizar, você precisa <Link to="/cadastro" onClick={() => setIsCartOpen(false)}>criar uma conta</Link> ou fazer o login.</small>
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