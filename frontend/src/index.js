import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Importa o CSS global
import App from './App';

// Pega a div com id 'root' do seu arquivo public/index.html
const root = ReactDOM.createRoot(document.getElementById('root'));

// Renderiza (desenha) seu componente principal <App /> dentro da div 'root'
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);