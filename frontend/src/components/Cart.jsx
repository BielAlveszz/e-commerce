const Cart = ({ isOpen, onClose, items, setCartItems, onCheckout }) => {
  const total = items.reduce((sum, item) => sum + (item.preco * item.quantity), 0);

  const handleUpdateQuantity = (id, newQuantity) => { /* ...sem alterações... */ };
  
  // Adiciona a classe 'show' ao offcanvas para exibi-lo
  const showClass = isOpen ? 'show' : '';

  return (
    <>
      {/* Backdrop (fundo escuro) */}
      <div className={`modal-backdrop fade ${showClass}`} style={{ display: isOpen ? 'block' : 'none' }}></div>
      
      {/* O Offcanvas */}
      <div 
        className={`offcanvas offcanvas-end ${showClass}`} 
        tabIndex="-1" 
        style={{ visibility: isOpen ? 'visible' : 'hidden' }}
      >
        <div className="offcanvas-header border-bottom">
          <h5 className="offcanvas-title">
            <i className="bi bi-cart me-2"></i>
            Seu Carrinho
          </h5>
          <button type="button" className="btn-close" onClick={onClose}></button>
        </div>
        <div className="offcanvas-body d-flex flex-column">
          {items.length === 0 ? (
            <div className="flex-grow-1 d-flex align-items-center justify-content-center">
              <p className="text-muted">Seu carrinho está vazio.</p>
            </div>
          ) : (
            <>
              <div className="flex-grow-1">
                {items.map(item => (
                  <div key={item.id} className="d-flex align-items-center gap-3 mb-3">
                    <img src={item.url_imagem} alt={item.nome} style={{width: '64px', height: '64px', objectFit: 'cover'}} className="rounded" />
                    <div className="flex-grow-1">
                      <p className="fw-semibold mb-0">{item.nome}</p>
                      <p className="text-muted small">R$ {parseFloat(item.preco).toFixed(2)}</p>
                    </div>
                    {/* ... controles de quantidade ... */}
                  </div>
                ))}
              </div>
              <div className="border-top pt-3">
                <div className="d-flex justify-content-between fs-5 fw-bold">
                  <span>Total:</span>
                  <span>R$ {total.toFixed(2)}</span>
                </div>
                <div className="d-grid mt-3">
                  <button onClick={onCheckout} className="btn btn-primary btn-lg">
                    Finalizar Compra
                  </button>
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