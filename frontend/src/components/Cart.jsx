import { useCart } from '../context/CartContext';
import { XLg, PlusLg, DashLg } from 'react-bootstrap-icons';

const Cart = () => {
  const { isCartOpen, setIsCartOpen, cartItems, updateQuantity, removeFromCart, checkout } = useCart();

  const total = cartItems.reduce((sum, item) => sum + (item.preco * item.quantity), 0);

  return (
    <>
      {/* O fundo escuro agora usa nossas classes CSS customizadas */}
      <div 
        className={`cart-backdrop ${isCartOpen ? 'is-open' : ''}`}
        onClick={() => setIsCartOpen(false)} 
      ></div>
      
      {/* O painel do carrinho também usa as classes customizadas */}
      <div 
        className={`cart-offcanvas ${isCartOpen ? 'is-open' : ''}`}
        // Este comando crucial impede que o clique no carrinho feche o modal
        onClick={(e) => e.stopPropagation()}
      >
        <div className="offcanvas-header border-bottom">
          <h5 className="offcanvas-title">Seu Carrinho</h5>
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
                      src={`/images/${item.url_imagem}`} 
                      alt={item.nome} 
                      style={{width: '64px', height: '64px', objectFit: 'cover'}} 
                      className="rounded" 
                    />
                    <div className="flex-grow-1">
                      <p className="fw-semibold mb-1">{item.nome}</p>
                      <p className="text-muted small">R$ {parseFloat(item.preco).toFixed(2)}</p>
                    </div>
                    <div className="d-flex align-items-center gap-2 border rounded p-1">
                      <button className="btn btn-sm btn-light" onClick={() => updateQuantity(item.id, item.quantity - 1)}><DashLg size={16}/></button>
                      <span className="fw-bold px-2">{item.quantity}</span>
                      <button className="btn btn-sm btn-light" onClick={() => updateQuantity(item.id, item.quantity + 1)}><PlusLg size={16}/></button>
                    </div>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => removeFromCart(item.id)}><XLg size={16}/></button>
                  </div>
                ))}
              </div>
              <div className="border-top p-3 bg-light">
                <div className="d-flex justify-content-between fs-5 fw-bold">
                  <span>Total:</span>
                  <span>R$ {total.toFixed(2)}</span>
                </div>
                <div className="d-grid mt-3">
                  <button onClick={checkout} className="btn btn-dark btn-lg">Finalizar Compra</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default Cart;