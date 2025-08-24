import React from 'react';
import { Outlet } from 'react-router-dom'; // Importe o Outlet
import Header from './Header';
import Cart from './Cart';

const Layout = () => {
  return (
    <div>
      <Header />
      <Cart />
      <main>
        <Outlet /> {/* O conteúdo das páginas (Index, ProdutoDetalhe, etc.) será renderizado aqui */}
      </main>
    </div>
  );
};

export default Layout;