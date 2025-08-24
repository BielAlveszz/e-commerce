import React, { useState, useEffect, useRef } from 'react';
import { Person, Cart, Search } from 'react-bootstrap-icons';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

const Header = () => {
  const { totalCartItems, setIsCartOpen } = useCart();
  const { isAuthenticated, user, logout } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/?search=${searchTerm.trim()}`);
    } else {
      // Se a busca estiver vazia, volta para a home
      navigate('/');
    }
  };

  // CORREÇÃO: Vamos observar a mudança no input de busca
  const handleSearchChange = (e) => {
    const newSearchTerm = e.target.value;
    setSearchTerm(newSearchTerm);
    // Se o usuário apagar todo o texto, volta para a home
    if (newSearchTerm === '') {
      navigate('/');
    }
  };
  
  // Lógica para fechar o dropdown... (sem alterações)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);


  return (
    <nav className="navbar navbar-expand-lg bg-white shadow-sm sticky-top py-3">
      <div className="container">
        <Link to="/" className="navbar-brand d-flex align-items-center gap-2">
            <div style={{ height: '32px', width: '32px', borderRadius: '50%', backgroundColor: '#343a40' }}></div>
            <span className="fw-bold fs-5">Meby Cosméticos</span>
        </Link>
        
        <div className="flex-grow-1 mx-4 d-none d-lg-block">
          <form onSubmit={handleSearch}>
            <div className="input-group">
              <span className="input-group-text bg-light border-end-0 text-muted"><Search /></span>
              <input 
                type="text" 
                className="form-control border-start-0 bg-light" 
                placeholder="Buscar produtos de beleza..."
                value={searchTerm}
                onChange={handleSearchChange} // Usa a nova função aqui
              />
            </div>
          </form>
        </div>

        <div className="d-flex align-items-center gap-3">
          {isAuthenticated && user ? (
            <div className="dropdown" ref={dropdownRef}>
                <button className="btn btn-light dropdown-toggle" type="button" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
                    <Person size={20} className="me-2"/>
                    Olá, {user.nome}
                </button>
                <ul className={`dropdown-menu dropdown-menu-end ${isDropdownOpen ? 'show' : ''}`}>
                    <li><Link className="dropdown-item" to="/minha-conta" onClick={() => setIsDropdownOpen(false)}>Minha Conta</Link></li>
                    <li><hr className="dropdown-divider" /></li>
                    <li><button className="dropdown-item" onClick={logout}>Sair</button></li>
                </ul>
            </div>
          ) : (
            <Link to="/login" className="btn btn-light">
              <Person size={20} className="me-2"/>
              Entrar
            </Link>
          )}

          <button type="button" className="btn btn-light position-relative p-2" onClick={() => setIsCartOpen(true)}>
            <Cart size={20} />
            {totalCartItems > 0 && (
              <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-dark">{totalCartItems}</span>
            )}
          </button>
        </div>
      </div>
    </nav> 
  );
};

export default Header;