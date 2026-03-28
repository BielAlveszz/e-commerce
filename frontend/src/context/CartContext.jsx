import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { apiFetch } from '../services/Api';

export const precoEfetivo = (item) =>
    item.preco_promocional && parseFloat(item.preco_promocional) > 0
        ? parseFloat(item.preco_promocional)
        : parseFloat(item.preco);

const CartContext = createContext();

export const CartProvider = ({ children }) => {
    const { isAuthenticated } = useAuth();
    const [cartItems, setCartItems]     = useState([]);
    const [isCartOpen, setIsCartOpen]   = useState(false);
    const [cartLoading, setCartLoading] = useState(false);

    useEffect(() => {
        if (isAuthenticated) {
            setCartLoading(true);
            apiFetch('/api/carrinho')
                .then(res => res.ok ? res.json() : null)
                .then(data => { if (data?.items) setCartItems(data.items); })
                .catch(() => {})
                .finally(() => setCartLoading(false));
        } else {
            setCartItems([]);
        }
    }, [isAuthenticated]);

    // Retorna a quantidade já no carrinho para um produto
    const quantidadeNoCarrinho = useCallback((productId) => {
        const item = cartItems.find(i => i.id === productId);
        return item ? (item.quantity || 1) : 0;
    }, [cartItems]);

    const addToCart = useCallback(async (product, quantity = 1) => {
        // Validação de estoque no frontend antes de qualquer chamada
        const jaNoCarrinho = quantidadeNoCarrinho(product.id);
        if (jaNoCarrinho + quantity > product.quantidade_estoque) {
            throw new Error(
                `Estoque insuficiente. Você já tem ${jaNoCarrinho} no carrinho e o estoque disponível é ${product.quantidade_estoque}.`
            );
        }

        if (isAuthenticated) {
            const res  = await apiFetch('/api/carrinho/items', {
                method: 'POST',
                body: JSON.stringify({ produto_id: product.id, quantidade: quantity }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            setCartItems(data.items);
            setIsCartOpen(true);
            return;
        }

        setCartItems(prev => {
            const existing = prev.find(i => i.id === product.id);
            if (existing) {
                return prev.map(i =>
                    i.id === product.id
                        ? { ...i, quantity: (i.quantity || 1) + quantity }
                        : i
                );
            }
            return [...prev, { ...product, quantity }];
        });
        setIsCartOpen(true);
    }, [isAuthenticated, quantidadeNoCarrinho]);

    const removeFromCart = useCallback(async (productId) => {
        if (isAuthenticated) {
            const res  = await apiFetch(`/api/carrinho/items/${productId}`, { method: 'DELETE' });
            const data = await res.json();
            if (res.ok) { setCartItems(data.items); return; }
            throw new Error(data.message);
        }
        setCartItems(prev => prev.filter(i => i.id !== productId));
    }, [isAuthenticated]);

    const updateQuantity = useCallback(async (productId, newQuantity) => {
        if (newQuantity <= 0) return removeFromCart(productId);

        // Validação de estoque no frontend ao atualizar quantidade
        const item = cartItems.find(i => i.id === productId);
        if (item && newQuantity > item.quantidade_estoque) {
            throw new Error(`Estoque máximo disponível: ${item.quantidade_estoque} unidades.`);
        }

        if (isAuthenticated) {
            const res  = await apiFetch(`/api/carrinho/items/${productId}`, {
                method: 'PUT',
                body: JSON.stringify({ quantidade: newQuantity }),
            });
            const data = await res.json();
            if (res.ok) { setCartItems(data.items); return; }
            throw new Error(data.message);
        }
        setCartItems(prev =>
            prev.map(i => i.id === productId ? { ...i, quantity: newQuantity } : i)
        );
    }, [isAuthenticated, removeFromCart, cartItems]);

    const mergeLocalCartOnLogin = useCallback(async (localItems) => {
        if (!localItems || localItems.length === 0) return;
        try {
            const res  = await apiFetch('/api/carrinho/merge', {
                method: 'POST',
                body: JSON.stringify({ items: localItems }),
            });
            const data = await res.json();
            if (res.ok) setCartItems(data.items);
        } catch (_) {}
    }, []);

    const checkout = useCallback(async (codigoCupom = null) => {
        if (cartItems.length === 0) throw new Error('O carrinho está vazio.');

        const itemsParaPedido = [...cartItems];

        const res = await apiFetch('/api/pedidos', {
            method: 'POST',
            body: JSON.stringify({
                cartItems: itemsParaPedido,
                ...(codigoCupom ? { codigoCupom } : {}),
            }),
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'Falha ao criar pedido.');
        }

        const orderData = await res.json();
        setCartItems([]);
        setIsCartOpen(false);

        return {
            pedido:      orderData.pedido,
            desconto:    orderData.desconto || 0,
            cartItems:   itemsParaPedido,
        };
    }, [cartItems]);

    const value = {
        cartItems,
        isCartOpen,
        cartLoading,
        setIsCartOpen,
        addToCart,
        removeFromCart,
        updateQuantity,
        mergeLocalCartOnLogin,
        checkout,
        quantidadeNoCarrinho,
        totalCartItems: cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0),
    };

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => useContext(CartContext);