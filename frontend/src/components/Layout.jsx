import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Cart from './Cart';
import { Toaster } from 'react-hot-toast'; // Garanta que esta linha está presente

const Layout = () => {
  return (
    <div>
      {/* Garanta que o <Toaster /> está aqui */}
      <Toaster position="bottom-left" />

      <Header />
      <Cart />
      <main>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;