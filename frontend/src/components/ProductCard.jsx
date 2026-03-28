import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { API_URL } from '../services/Api';

const ProductCard = ({ product }) => {
  const { addToCart } = useCart();
  const imageUrl = `${API_URL}/images/${product.url_imagem}`;
  const onSale = product.preco_promocional && parseFloat(product.preco_promocional) > 0;

  return (
    <Link to={`/produto/${product.id}`} className="card h-100 border-0 product-card text-decoration-none text-dark">
      <img
        src={imageUrl}
        className="card-img-top"
        alt={product.nome}
        onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/300?text=Imagem+Nao+Encontrada"; }}
      />
      <div className="card-body d-flex flex-column">
        <h5 className="card-title">{product.nome}</h5>
        <p className="card-text text-muted small">Estoque: {product.quantidade_estoque}</p>

        <div className="mt-auto">
          {onSale ? (
            <>
              <span className="card-text text-muted text-decoration-line-through me-2 small">
                R$ {parseFloat(product.preco).toFixed(2)}
              </span>
              <p className="card-text fs-4 fw-bold d-inline" style={{ color: 'var(--meby-rosa-seco)' }}>
                R$ {parseFloat(product.preco_promocional).toFixed(2)}
              </p>
            </>
          ) : (
            <p className="card-text fs-4 fw-bold">
              R$ {parseFloat(product.preco).toFixed(2)}
            </p>
          )}
        </div>

        <button
          onClick={(e) => {
            e.preventDefault();
            addToCart(product);
          }}
          disabled={product.quantidade_estoque === 0}
          className="btn btn-dark-custom w-100 mt-2"
        >
          {product.quantidade_estoque > 0 ? "Adicionar ao Carrinho" : "Esgotado"}
        </button>
      </div>
    </Link>
  );
};

export default ProductCard;