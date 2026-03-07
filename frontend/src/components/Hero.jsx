import React from 'react';
import { Link } from 'react-router-dom';
import heroImage from '../assets/hero-meby-premium.jpg'; // Usar a nova imagem panorâmica premium

const Hero = () => {
  return (
    <div 
      className="hero-banner" 
      style={{ 
        backgroundImage: `url(${heroImage})`,
        backgroundSize: 'cover', // Preenche todo o espaço
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        minHeight: '500px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
      }}
    >
      {/* Overlay suave para melhorar legibilidade do texto */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.05)', // Overlay bem suave
          zIndex: 1
        }}
      />
      
      <div 
        className="hero-content" 
        style={{ 
          zIndex: 2, 
          textAlign: 'center',
          padding: '20px',
          borderRadius: '10px'
        }}
      >
        <h1 className="display-4 fw-bold mb-3" style={{ color: '#fff', textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
          Realce sua beleza natural
        </h1>
        <p className="lead mb-4" style={{ color: '#fff', fontWeight: '500', textShadow: '1px 1px 3px rgba(0,0,0,0.3)' }}>
          Descubra a Caixa Lapidação Meby e transforme sua rotina de beleza.
        </p>
        <div className="d-grid gap-2 d-sm-flex justify-content-sm-center">
          <Link to="/?view=all" className="btn btn-dark-custom btn-lg px-4 gap-3">Explorar Todos os Produtos</Link>
          <Link to="/?ofertas=true" className="btn btn-outline-light btn-lg px-4">Ver Ofertas</Link>
        </div>
      </div>
    </div>
  );
};

export default Hero;