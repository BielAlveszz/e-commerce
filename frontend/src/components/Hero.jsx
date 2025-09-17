import React from 'react';
import { Link } from 'react-router-dom';
import heroImage from '../assets/hero-beauty.jpg';

const Hero = () => {
  return (
    <div 
      className="hero-banner" 
      style={{ backgroundImage: `url(${heroImage})` }}
    >
      <div className="hero-content">
        <h1 className="display-4 fw-bold mb-3">
          Realce sua beleza natural
        </h1>
        <p className="lead mb-4">
          Descubra nossa coleção exclusiva de maquiagem e produtos de beleza premium.
        </p>
        <div className="d-grid gap-2 d-sm-flex justify-content-sm-center">
          {/* CORREÇÃO: O link agora aponta para /?view=all para carregar todos os produtos */}
          <Link to="/?view=all" className="btn btn-dark-custom btn-lg px-4 gap-3">Explorar Todos os Produtos</Link>
          <Link to="/?ofertas=true" className="btn btn-outline-light btn-lg px-4">Ver Ofertas</Link>
        </div>
      </div>
    </div>
  );
};

export default Hero;