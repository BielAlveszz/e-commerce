import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AdminLayout = () => {
  const { logout } = useAuth();

  return (
    <div>
      <nav className="navbar navbar-expand-lg bg-dark" data-bs-theme="dark">
        <div className="container">
          <Link to="/admin/dashboard" className="navbar-brand">Painel Meby Cosméticos</Link>
          <div className="d-flex">
            <Link to="/" className="btn btn-outline-light me-2">Ver Loja</Link>
            <button className="btn btn-danger" onClick={logout}>Sair</button>
          </div>
        </div>
      </nav>
      
      {/* O Outlet renderizará o componente da rota filha aqui (Dashboard, Pedidos, etc.) */}
      <Outlet />
    </div>
  );
};

export default AdminLayout;