import React, { useState, useEffect, useRef } from 'react';
import { Person, Cart, Search, X, ShieldLock } from 'react-bootstrap-icons';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

const Header = () => {
    const { totalCartItems, setIsCartOpen } = useCart();
    const { isAuthenticated, user, logout } = useAuth();
    const [searchTerm, setSearchTerm]             = useState('');
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen]     = useState(false);
    const navigate        = useNavigate();
    const dropdownRef     = useRef(null);
    const mobileSearchRef = useRef(null);

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            navigate(`/?search=${encodeURIComponent(searchTerm.trim())}`);
            setMobileSearchOpen(false);
        } else {
            navigate('/');
        }
    };

    const handleSearchChange = (e) => {
        const val = e.target.value;
        setSearchTerm(val);
        if (val === '') navigate('/');
    };

    const handleLogout = async () => {
        setIsDropdownOpen(false);
        await logout();
        navigate('/');
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <>
            <nav className="navbar navbar-expand-lg bg-white shadow-sm sticky-top py-3">
                <div className="container">
                    <Link to="/" className="navbar-brand">
                        <span style={{ fontSize: '24px', color: '#5a1a1a', fontFamily: "'Playfair Display', serif", letterSpacing: '1px', fontWeight: 700 }}>
                            Meby
                        </span>
                    </Link>

                    {/* Busca desktop */}
                    <div className="flex-grow-1 mx-4 d-none d-lg-block">
                        <form onSubmit={handleSearch}>
                            <div className="input-group">
                                <span className="input-group-text bg-light border-end-0 text-muted"><Search /></span>
                                <input type="text" className="form-control border-start-0 bg-light"
                                    placeholder="Buscar produtos de beleza..."
                                    value={searchTerm} onChange={handleSearchChange} />
                            </div>
                        </form>
                    </div>

                    <div className="d-flex align-items-center gap-2">
                        {/* Busca mobile */}
                        <button type="button" className="btn btn-light d-lg-none p-2"
                            onClick={() => { setMobileSearchOpen(p => !p); setTimeout(() => mobileSearchRef.current?.focus(), 100); }}>
                            {mobileSearchOpen ? <X size={20} /> : <Search size={20} />}
                        </button>

                        {isAuthenticated && user ? (
                            <div className="dropdown" ref={dropdownRef}>
                                <button
                                    className="btn btn-light dropdown-toggle d-flex align-items-center gap-1"
                                    onClick={() => setIsDropdownOpen(p => !p)}
                                >
                                    <Person size={20} />
                                    <span className="d-none d-sm-inline">Olá, {user.nome?.split(' ')[0] || 'Usuário'}</span>
                                    {/* Indicador visual de admin na badge */}
                                    {user.is_admin && (
                                        <span
                                            className="badge rounded-pill ms-1"
                                            style={{
                                                backgroundColor: 'var(--meby-rosa-seco)',
                                                fontSize: '0.6rem',
                                                padding: '2px 6px',
                                                verticalAlign: 'middle',
                                            }}
                                        >
                                            Admin
                                        </span>
                                    )}
                                </button>

                                <ul className={`dropdown-menu dropdown-menu-end ${isDropdownOpen ? 'show' : ''}`}
                                    style={{ minWidth: 200 }}>

                                    {/* Info do usuário no topo do dropdown */}
                                    <li>
                                        <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--meby-rosa-claro)' }}>
                                            <p className="mb-0 fw-bold" style={{ fontSize: '0.875rem', color: 'var(--meby-texto-escuro)' }}>
                                                {user.nome}
                                            </p>
                                            <p className="mb-0 text-muted" style={{ fontSize: '0.75rem' }}>
                                                {user.email}
                                            </p>
                                        </div>
                                    </li>

                                    {/* Botão de Painel Admin — visível apenas para admins */}
                                    {user.is_admin && (
                                        <>
                                            <li>
                                                <Link
                                                    className="dropdown-item d-flex align-items-center gap-2"
                                                    to="/admin/dashboard"
                                                    onClick={() => setIsDropdownOpen(false)}
                                                    style={{fontWeight: 600 }}
                                                >
                                                    <ShieldLock size={16} />
                                                    Painel Admin
                                                </Link>
                                            </li>
                                            <li><hr className="dropdown-divider" style={{ borderColor: 'var(--meby-rosa-claro)' }} /></li>
                                        </>
                                    )}

                                    <li>
                                        <Link
                                            className="dropdown-item"
                                            to="/minha-conta"
                                            onClick={() => setIsDropdownOpen(false)}
                                        >
                                            Minha Conta
                                        </Link>
                                    </li>
                                    <li><hr className="dropdown-divider" style={{ borderColor: 'var(--meby-rosa-claro)' }} /></li>
                                    <li>
                                        <button className="dropdown-item text-danger" onClick={handleLogout}>
                                            Sair
                                        </button>
                                    </li>
                                </ul>
                            </div>
                        ) : (
                            <Link to="/login" className="btn btn-light d-flex align-items-center gap-1">
                                <Person size={20} />
                                <span className="d-none d-sm-inline">Entrar</span>
                            </Link>
                        )}

                        <button type="button" className="btn btn-light position-relative p-2"
                            onClick={() => setIsCartOpen(true)}>
                            <Cart size={20} />
                            {totalCartItems > 0 && (
                                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-dark">
                                    {totalCartItems}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </nav>

            {/* Busca mobile expandida */}
            {mobileSearchOpen && (
                <div className="bg-white border-bottom px-3 py-2 d-lg-none">
                    <form onSubmit={handleSearch}>
                        <div className="input-group">
                            <span className="input-group-text bg-light border-end-0 text-muted"><Search /></span>
                            <input ref={mobileSearchRef} type="text" className="form-control border-start-0 bg-light"
                                placeholder="Buscar produtos..." value={searchTerm} onChange={handleSearchChange} autoFocus />
                            <button type="submit" className="btn btn-dark-custom">Buscar</button>
                        </div>
                    </form>
                </div>
            )}
        </>
    );
};

export default Header;