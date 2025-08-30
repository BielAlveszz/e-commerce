import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, authLoading } = useAuth();

  // Se a verificação de autenticação ainda está em andamento, mostra um loading.
  if (authLoading) {
    return <div className="container text-center my-5"><h2>Verificando acesso...</h2></div>;
  }

  // Se a verificação terminou e o usuário não está autenticado, redireciona para o login.
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Se a verificação terminou e o usuário está autenticado, renderiza a página.
  return children;
};

export default ProtectedRoute;