import React, { createContext, useState, useContext } from 'react';
import { useAuth } from './AuthContext'; // Importa o useAuth para saber se o usuário está logado

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { token } = useAuth(); // Pega o token do usuário logado
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const addToCart = (productToAdd) => {
    setCartItems(prevItems => {
      const isItemInCart = prevItems.find(item => item.id === productToAdd.id);
      if (isItemInCart) {
        return prevItems.map(item =>
          item.id === productToAdd.id
            ? { ...item, quantity: item.quantity + 1 }
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

  // Função de checkout simplificada: só funciona se o usuário estiver logado
  const checkout = async () => {
    if (cartItems.length === 0 || !token) return;

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
      alert(`Pedido #${orderData.pedido.id} criado com sucesso!`);
      
      setCartItems([]);
      setIsCartOpen(false);
      // Idealmente, aqui você também recarregaria os produtos para atualizar o estoque na home
    } catch (error) {
      alert(`Erro no checkout: ${error.message}`);
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