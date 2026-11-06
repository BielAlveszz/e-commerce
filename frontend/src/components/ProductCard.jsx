import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { API_URL } from '../services/Api';
import { IMG_PLACEHOLDER } from '../utils/imgPlaceholder';

const ProductCard = ({ product }) => {
  const { addToCart } = useCart();

  // Estado para sabermos se a imagem já terminou de carregar
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const imageUrl = (product.url_imagem && !imgError)
    ? `${API_URL}/images/${product.url_imagem}`
    : IMG_PLACEHOLDER;
  const onSale = product.preco_promocional && parseFloat(product.preco_promocional) > 0;

  return (
    <Link to={`/produto/${product.id}`} className="card h-100 border-0 product-card text-decoration-none text-dark shadow-sm">

      {/* Container da Imagem: Altura fixa de 280px (igual ao seu Skeleton)
        Isso impede que o layout "pule" enquanto a imagem carrega
      */}
      <div
        className="position-relative bg-light"
        style={{ height: '280px', overflow: 'hidden', borderTopLeftRadius: 'var(--bs-card-inner-border-radius)', borderTopRightRadius: 'var(--bs-card-inner-border-radius)' }}
      >
        {/* Mostra um pequeno spinner de carregamento enquanto a imagem não vem */}
        {!imageLoaded && (
          <div className="position-absolute w-100 h-100 d-flex justify-content-center align-items-center">
            <div className="spinner-border text-secondary spinner-border-sm" role="status">
              <span className="visually-hidden">A carregar...</span>
            </div>
          </div>
        )}

        <img
          src={imageUrl}
          className="card-img-top w-100 h-100"
          alt={product.nome}
          loading="lazy"        // A MÁGICA ESTÁ AQUI: Só carrega quando chega perto da tela
          decoding="async"      // Ajuda a não travar a rolagem do site no celular
          style={{
            objectFit: 'cover',
            opacity: imageLoaded ? 1 : 0, // Efeito suave de aparecimento (Fade in)
            transition: 'opacity 0.3s ease-in-out'
          }}
          onLoad={() => setImageLoaded(true)}
          onError={() => { setImgError(true); setImageLoaded(true); }}
        />
      </div>

      <div className="card-body d-flex flex-column">
        <h5 className="card-title fw-bold">{product.nome}</h5>
        <p className="card-text text-muted small mb-3">Estoque: {product.quantidade_estoque}</p>

        <div className="mt-auto">
          {onSale ? (
            <div className="d-flex align-items-baseline gap-2">
              <span className="card-text text-muted text-decoration-line-through small">
                R$ {parseFloat(product.preco).toFixed(2)}
              </span>
              <p className="card-text fs-5 fw-bold mb-0" style={{ color: 'var(--meby-rosa-seco)' }}>
                R$ {parseFloat(product.preco_promocional).toFixed(2)}
              </p>
            </div>
          ) : (
            <p className="card-text fs-5 fw-bold mb-0">
              R$ {parseFloat(product.preco).toFixed(2)}
            </p>
          )}
        </div>

        <button
          onClick={(e) => {
            e.preventDefault(); // Impede o Link de abrir a página do produto ao clicar no botão
            addToCart(product);
          }}
          disabled={product.quantidade_estoque === 0}
          className="btn btn-dark-custom w-100 mt-3"
        >
          {product.quantidade_estoque > 0 ? "Adicionar ao Carrinho" : "Esgotado"}
        </button>
      </div>
    </Link>
  );
};

export default ProductCard;