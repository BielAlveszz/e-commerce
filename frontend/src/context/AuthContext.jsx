import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { apiFetch } from '../services/Api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser]               = useState(null);
    const [authLoading, setAuthLoading] = useState(true);

    // Verifica se o cookie de sessão ainda é válido ao carregar a aplicação
    useEffect(() => {
        apiFetch('/api/clientes/me')
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data?.user) setUser(data.user);
            })
            .catch(() => {})
            .finally(() => setAuthLoading(false));
    }, []);

    // Recebe os dados do usuário vindos da resposta da API de login
    // O token fica no httpOnly cookie — JavaScript nunca o vê
    const login = useCallback((userData, localCartItems = []) => {
        setUser(userData);
        return localCartItems; // retorna para o CartContext fazer o merge
    }, []);

    const logout = useCallback(async () => {
        try {
            await apiFetch('/api/clientes/logout', { method: 'POST' });
        } catch (_) {}
        setUser(null);
    }, []);

    // Atualiza dados do usuário no contexto (usado após edição de perfil)
    const updateUser = useCallback((dadosAtualizados) => {
        setUser(prev => prev ? { ...prev, ...dadosAtualizados } : prev);
    }, []);

    const value = {
        user,
        login,
        logout,
        updateUser,
        isAuthenticated: !!user,
        authLoading,
    };

    return (
        <AuthContext.Provider value={value}>
            {!authLoading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);