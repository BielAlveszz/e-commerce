import React, { useState } from 'react';
import { Outlet, Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Toaster } from 'react-hot-toast';

const AdminLayout = () => {
  const { logout }  = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinkClass = ({ isActive }) =>
    isActive ? 'nav-link fw-bold text-white' : 'nav-link text-white-50';

  const links = [
    { to: '/admin/dashboard',     label: 'Dashboard'      },
    { to: '/admin/pedidos',       label: 'Pedidos'        },
    { to: '/admin/produtos',      label: 'Produtos', end: true },
    { to: '/admin/categorias',    label: 'Categorias'     },
    { to: '/admin/cupons',        label: 'Cupons'         },
    { to: '/admin/produtos/novo', label: '+ Novo Produto' },
  ];

  return (
    <div>
      <Toaster position="bottom-left" />

      <nav style={{ backgroundColor: '#212529', padding: '0.75rem 0', position: 'sticky', top: 0, zIndex: 1030 }}>
        <div className="container">

          {/* Desktop */}
          <div className="d-none d-md-flex align-items-center gap-2 w-100">
            <Link to="/admin/dashboard"
              style={{ color: '#fff', fontWeight: 700, fontSize: '1rem', textDecoration: 'none', whiteSpace: 'nowrap', marginRight: 8 }}>
              Meby — Admin
            </Link>
            <ul className="d-flex flex-row gap-1 list-unstyled mb-0 flex-grow-1 flex-wrap">
              {links.map(item => (
                <li key={item.to}>
                  <NavLink to={item.to} end={item.end} className={navLinkClass}
                    style={{ whiteSpace: 'nowrap', fontSize: '0.9rem', padding: '0.4rem 0.75rem' }}>
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
            <div className="d-flex gap-2 flex-shrink-0">
              <Link to="/" className="btn btn-sm btn-outline-custom">Ver Loja</Link>
              <button className="btn btn-sm btn-dark-custom" onClick={logout}>Sair</button>
            </div>
          </div>

          {/* Mobile — cabeçalho */}
          <div className="d-flex d-md-none align-items-center justify-content-between">
            <Link to="/admin/dashboard"
              style={{ color: '#fff', fontWeight: 700, textDecoration: 'none' }}>
              Meby — Admin
            </Link>
            <button
              className="btn btn-sm btn-outline-light"
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Menu">
              ☰
            </button>
          </div>

          {/* Mobile — menu expandido */}
          {menuOpen && (
            <div className="d-md-none mt-2 pb-2" style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}>
              <ul className="list-unstyled mb-3 mt-2">
                {links.map(item => (
                  <li key={item.to}>
                    <NavLink to={item.to} end={item.end} className={navLinkClass}
                      onClick={() => setMenuOpen(false)}
                      style={{ display: 'block', padding: '0.5rem 0' }}>
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
              <div className="d-flex gap-2">
                <Link to="/" className="btn btn-sm btn-outline-custom flex-grow-1"
                  onClick={() => setMenuOpen(false)}>Ver Loja</Link>
                <button className="btn btn-sm btn-dark-custom flex-grow-1" onClick={logout}>Sair</button>
              </div>
            </div>
          )}

        </div>
      </nav>

      <Outlet />
    </div>
  );
};

export default AdminLayout;