import React, { createContext, useState, useContext, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  // NOVO ESTADO: Controla se a verificação inicial do token no localStorage já terminou.
  const [authLoading, setAuthLoading] = useState(true);

  // Este useEffect roda APENAS UMA VEZ quando a aplicação inicia.
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        const decodedUser = jwtDecode(storedToken);
        // Verifica se o token não expirou (opcional, mas recomendado)
        if (decodedUser.exp * 1000 > Date.now()) {
          setToken(storedToken);
          setUser(decodedUser);
        } else {
          // Se o token expirou, remove.
          localStorage.removeItem('token');
        }
      }
    } catch (error) {
      console.error("Erro ao decodificar token:", error);
      localStorage.removeItem('token');
    } finally {
      // Informa que a verificação inicial terminou.
      setAuthLoading(false);
    }
  }, []); // O array vazio [] garante que rode apenas uma vez.

  const login = (newToken) => {
    localStorage.setItem('token', newToken);
    try {
      const decodedUser = jwtDecode(newToken);
      setToken(newToken);
      setUser(decodedUser);
    } catch (error) {
      // Limpa tudo em caso de token inválido no login
      logout();
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const value = {
    token,
    user,
    login,
    logout,
    isAuthenticated: !!token,
    authLoading // <-- Exporta o novo estado
  };

  // Só renderiza o resto da aplicação quando a verificação inicial terminar
  return (
    <AuthContext.Provider value={value}>
      {!authLoading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};