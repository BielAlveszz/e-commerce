import React from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Whatsapp, EnvelopeFill, CreditCard, ShieldCheck } from 'react-bootstrap-icons';

const Footer = () => {
  // Altere para a cor oficial da Meby se preferir (ex: 'var(--meby-rosa-seco)')
  const footerStyle = {
    backgroundColor: 'var(--meby-rosa-seco)',
    color: '#ffffff',
    padding: '3rem 0 1rem 0',
    marginTop: 'auto' // Empurra o footer para o final da página
  };

  const linkStyle = {
    color: '#cccccc',
    textDecoration: 'none',
    fontSize: '0.9rem',
    display: 'block',
    marginBottom: '8px',
    transition: 'color 0.2s'
  };

  return (
    <footer style={footerStyle}>
      <div className="container">
        <div className="row g-4 mb-4">

          {/* Coluna 1: Links Institucionais */}
          <div className="col-12 col-md-4">
            <h5 className="mb-3 fw-bold">Meby Cosméticos</h5>
            <Link to="/sobre-nos" style={linkStyle} onMouseOver={(e) => e.target.style.color = 'white'} onMouseOut={(e) => e.target.style.color = '#ccc'}>
              Sobre Nós
            </Link>
            <Link to="/politica-de-privacidade" style={linkStyle} onMouseOver={(e) => e.target.style.color = 'white'} onMouseOut={(e) => e.target.style.color = '#ccc'}>
              Política de Privacidade
            </Link>
            <Link to="/termos-de-uso" style={linkStyle} onMouseOver={(e) => e.target.style.color = 'white'} onMouseOut={(e) => e.target.style.color = '#ccc'}>
              Termos de Uso
            </Link>
            <Link to="/minha-conta" style={linkStyle} onMouseOver={(e) => e.target.style.color = 'white'} onMouseOut={(e) => e.target.style.color = '#ccc'}>
              Rastrear meu pedido
            </Link>
          </div>

          {/* Coluna 2: Atendimento e Redes Sociais */}
          <div className="col-12 col-md-4 text-md-center">
            <h5 className="mb-3 fw-bold">Atendimento</h5>
            <div className="d-flex flex-column align-items-md-center mb-3">
              <a href="https://wa.me/5511993630521" target="_blank" rel="noreferrer" style={linkStyle}>
                <Whatsapp className="me-2" /> (11) 99363-0521
              </a>
              <a href="mailto:contato@meby.com.br" style={linkStyle}>
                <EnvelopeFill className="me-2" /> cosmesticosmeby@gmail.com
              </a>
            </div>

            <h6 className="mt-4 mb-2">Siga a gente!</h6>
            <div className="d-flex justify-content-md-center gap-3">
              <a href="https://instagram.com/meby_cosmeticos" target="_blank" rel="noreferrer" className="text-white fs-4">
                <Instagram />
              </a>
              {/* Adicione o Tiktok ou Facebook aqui se quiser */}
            </div>
          </div>

          {/* Coluna 3: Pagamento e Segurança */}
          {/* Coluna 3: Pagamento e Segurança */}
          <div className="col-12 col-md-4 text-md-end">
            <h5 className="mb-3 fw-bold">Formas de Pagamento</h5>

            {/* Bandeiras de Cartões e PIX */}
            <div className="d-flex gap-2 justify-content-md-end mb-4 flex-wrap">
              <span className="badge bg-light text-dark border border-secondary px-2 py-1" style={{ fontSize: '0.85rem' }}>Visa</span>
              <span className="badge bg-light text-dark border border-secondary px-2 py-1" style={{ fontSize: '0.85rem' }}>Mastercard</span>
              <span className="badge bg-light text-dark border border-secondary px-2 py-1" style={{ fontSize: '0.85rem' }}>Elo</span>

              <span className="badge bg-white text-success border border-success px-2 py-1 fw-bold" style={{ fontSize: '0.85rem' }}>
                <i className="bi bi-x-diamond-fill me-1"></i> PIX
              </span>
            </div>

            <h5 className="mb-3 fw-bold">Segurança</h5>
            <div className="text-muted d-flex align-items-center justify-content-md-end gap-1">
              <ShieldCheck size={20} className="text-success" />
              <small>Ambiente 100% Seguro</small>
            </div>
          </div>

        </div>

        <hr className="border-secondary" />

        {/* Linha de Copyright */}
        <div className="text-center text-muted small mt-3">
          <p className="mb-1">
            © {new Date().getFullYear()} Meby Cosméticos. Todos os direitos reservados.
          </p>
          <p className="mb-0" style={{ fontSize: '0.8rem' }}>
            CNPJ: 00.000.000/0001-00 | São Paulo, SP - Brasil
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;