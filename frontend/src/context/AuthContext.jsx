import React, { createContext, useState, useContext, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode'; // Precisaremos instalar esta biblioteca

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);

  // Efeito que roda quando o componente é criado ou o token muda
  useEffect(() => {
    try {
      if (token) {
        // Decodifica o token para pegar as informações do usuário (id, nome)
        const decodedUser = jwtDecode(token);
        setUser(decodedUser);
        localStorage.setItem('token', token);
      } else {
        setUser(null);
        localStorage.removeItem('token');
      }
    } catch (error) {
      // Se o token for inválido, limpa tudo
      setUser(null);
      localStorage.removeItem('token');
    }
  }, [token]);

  const login = (newToken) => {
    setToken(newToken);
  };

  const logout = () => {
    setToken(null);
  };

  const value = {
    token,
    user,
    login,
    logout,
    isAuthenticated: !!token // Uma forma fácil de verificar se o usuário está logado
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};