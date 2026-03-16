import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AdminRoute = ({ children }) => {
  const { user, isAuthenticated, authLoading } = useAuth();

  // Enquanto verifica o token no localStorage, mostra tela de carregamento
  if (authLoading) {
    return <div className="p-8 text-center">Carregando painel...</div>;
  }

  // Se não estiver logado, manda para o login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Se estiver logado, mas o is_admin for falso ou não existir, manda pra home
  if (!user?.is_admin) {
    return <Navigate to="/" replace />;
  }

  // Se for admin, renderiza a tela solicitada
  return children;
};

export default AdminRoute;