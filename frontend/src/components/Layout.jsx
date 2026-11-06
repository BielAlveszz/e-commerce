import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Cart from './Cart';
import Footer from './Footer'; // 1. Importe o Footer
import { Toaster } from 'react-hot-toast';

const Layout = () => {
  return (
    // O estilo flex garante que o footer fique sempre colado no fundo da tela, mesmo em páginas curtas
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div style={{
        backgroundColor: 'var(--meby-rosa-seco)',
        color: 'white',
        textAlign: 'center',
        padding: '8px 16px',
        fontSize: '0.85rem',
        fontWeight: '500',
        letterSpacing: '0.5px'
      }}>
        📍 Entregas exclusivas para São Paulo - SP e Pontos de Encontro.
      </div>

      <Toaster position="bottom-left" />
      <Header />
      <Cart />
      
      {/* O flex: 1 faz o main empurrar o footer para baixo */}
      <main style={{ flex: 1 }}> 
        <Outlet />
      </main>

      {/* 2. Coloque o Footer depois do <main> */}
      <Footer /> 
    </div>
  );
};

export default Layout;