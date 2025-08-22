import { Search, Heart, Person, Cart } from 'react-bootstrap-icons'; // Usando ícones do Bootstrap

const Header = ({ cartItems, onCartClick }) => {
  return (
    <nav className="navbar navbar-expand-lg bg-white shadow-sm sticky-top py-3">
      <div className="container">
        {/* Logo */}
        <a className="navbar-brand d-flex align-items-center gap-2" href="/">
          <div 
            style={{ 
              height: '32px', 
              width: '32px', 
              borderRadius: '50%', 
              backgroundColor: '#343a40' 
            }}
          ></div>
          <span className="fw-bold fs-5">Meby Cosméticos</span>
        </a>

        {/* Barra de Busca Central (escondida em telas pequenas) */}
        <div className="flex-grow-1 mx-4 d-none d-lg-block">
          <div className="input-group">
            <span className="input-group-text bg-light border-end-0 text-muted">
              <Search />
            </span>
            <input 
              type="text" 
              className="form-control border-start-0 bg-light" 
              placeholder="Buscar produtos de beleza..." 
            />
          </div>
        </div>

        {/* Ícones de Ação */}
        <div className="d-flex align-items-center gap-2">
          <button className="btn btn-light d-none d-lg-inline-flex p-2">
            <Heart size={20} />
          </button>
          <button className="btn btn-light d-none d-lg-inline-flex p-2">
            <Person size={20} />
          </button>
          <button 
            type="button" 
            className="btn btn-light position-relative p-2"
            onClick={onCartClick}
          >
            <Cart size={20} />
            {cartItems > 0 && (
              <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-dark">
                {cartItems}
              </span>
            )}
          </button>
        </div>
      </div>
    </nav> 
  );
};

export default Header;