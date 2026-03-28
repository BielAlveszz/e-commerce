import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className="container text-center" style={{ paddingTop: '80px', paddingBottom: '80px' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>
        {/* Número 404 decorativo */}
        <p
          style={{
            fontSize: 'clamp(5rem, 20vw, 9rem)',
            fontFamily: "'Playfair Display', serif",
            fontWeight: 700,
            color: 'var(--meby-rosa-claro)',
            lineHeight: 1,
            margin: 0,
            userSelect: 'none',
          }}
        >
          404
        </p>

        <h1
          className="mb-3"
          style={{ color: 'var(--meby-texto-escuro)', fontSize: 'clamp(1.3rem, 4vw, 1.8rem)' }}
        >
          Página não encontrada
        </h1>

        <p className="text-muted mb-5" style={{ fontSize: '1rem', lineHeight: 1.6 }}>
          O endereço que você digitou não existe ou foi removido.
          <br />
          Que tal explorar nossos produtos?
        </p>

        <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center">
          <Link to="/" className="btn btn-dark-custom btn-lg px-4">
            Ir para a Home
          </Link>
          <button
            onClick={() => navigate(-1)}
            className="btn btn-outline-custom btn-lg px-4"
          >
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;