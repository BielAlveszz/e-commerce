import React from 'react';
import { Link } from 'react-router-dom';
import heroImage from '../assets/hero-meby-premium.jpg';

const Hero = () => {
  return (
    <div
      className="hero-banner"
      style={{
        backgroundImage: `url(${heroImage})`,
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        minHeight: '500px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      {/* Overlay mais escuro para garantir contraste sobre imagem clara */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, rgba(60,30,30,0.45) 0%, rgba(60,30,30,0.55) 100%)',
          zIndex: 1,
        }}
      />

      <div
        className="hero-content"
        style={{
          zIndex: 2,
          textAlign: 'center',
          padding: '24px 20px',
        }}
      >
        <h1
          className="display-4 fw-bold mb-3"
          style={{
            color: '#ffffff',
            textShadow: '1px 2px 8px rgba(0,0,0,0.5)',
            fontFamily: "'Playfair Display', serif",
          }}
        >
          A beleza que começa primeiro em você
        </h1>
        <p
          className="lead mb-4"
          style={{
            color: '#f5e6e1',
            fontWeight: '500',
            textShadow: '1px 1px 6px rgba(0,0,0,0.5)',
          }}
        >
          Veja todos os produtos ou confira nossas ofertas.
        </p>
        <div className="d-grid gap-2 d-sm-flex justify-content-sm-center">
          <Link
            to="/?view=all"
            className="btn btn-hero-primary btn-lg px-4"
          >
            Explorar Todos os Produtos
          </Link>
          <Link
            to="/?ofertas=true"
            className="btn btn-hero-outline btn-lg px-4"
          >
            Ver Ofertas
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Hero;