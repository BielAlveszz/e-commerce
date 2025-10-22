import React, { createContext, useState, useContext } from 'react';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { token } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const addToCart = (productToAdd) => {
    setCartItems(prevItems => {
      const isItemInCart = prevItems.find(item => item.id === productToAdd.id);
      if (isItemInCart) {
        return prevItems.map(item =>
          item.id === productToAdd.id
            ? { ...item, quantity: (item.quantity || 1) + 1 }
            : item
        );
      }
      return [...prevItems, { ...productToAdd, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (productId) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== productId));
  };
  
  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
    } else {
      setCartItems(prevItems => 
        prevItems.map(item => 
          item.id === productId ? { ...item, quantity: newQuantity } : item
        )
      );
    }
  };

  const checkout = async () => {
    if (cartItems.length === 0 || !token) {
      throw new Error("O carrinho está vazio ou você não está logado.");
    }

    // Guarda uma cópia dos itens do carrinho antes de qualquer coisa
    const itemsParaPedido = [...cartItems];

    try {
      const response = await fetch('http://localhost:3001/api/pedidos', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ cartItems: itemsParaPedido }) // Usa a cópia
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao criar pedido');
      }
      
      const orderData = await response.json();
      
      setCartItems([]);
      setIsCartOpen(false);
      
      // AQUI ESTÁ A MUDANÇA: Retorna o pedido E a cópia dos itens
      return { pedido: orderData.pedido, cartItems: itemsParaPedido }; 

    } catch (error) {
      console.error("Erro no checkout:", error);
      throw error; 
    }
  };

  const value = {
    cartItems,
    isCartOpen,
    setIsCartOpen,
    addToCart,
    removeFromCart,
    updateQuantity,
    checkout,
    totalCartItems: cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0)
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  return useContext(CartContext);
};