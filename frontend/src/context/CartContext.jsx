import React, { createContext, useState, useContext } from 'react';
import { useAuth } from './AuthContext'; // Precisamos do token para o checkout

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

  // Função de checkout que cria o pedido e retorna os dados
  const checkout = async () => {
    if (cartItems.length === 0 || !token) {
      throw new Error("O carrinho está vazio ou você não está logado.");
    }

    try {
      const response = await fetch('http://localhost:3001/api/pedidos', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // Envia o token para a rota protegida
        },
        body: JSON.stringify({ cartItems: cartItems })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao criar pedido');
      }
      
      const orderData = await response.json();
      
      // Limpa o carrinho APENAS após o sucesso da criação do pedido
      setCartItems([]);
      setIsCartOpen(false);
      
      // Retorna os dados do pedido criado para a página de checkout
      return orderData.pedido; 

    } catch (error) {
      console.error("Erro no checkout:", error);
      // Lança o erro para que a página de checkout possa tratá-lo
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