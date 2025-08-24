import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const ProductCard = ({ product }) => {
  const { addToCart } = useCart();
  
  // CORREÇÃO: O caminho da imagem deve ser montado a partir da pasta `public`
  // Se você criou a pasta `images` dentro de `public`, este caminho está correto.
  const imageUrl = `/images/${product.url_imagem}`;

  return (
    <Link to={`/produto/${product.id}`} className="card h-100 border-0 product-card text-decoration-none text-dark">
      <img 
        src={imageUrl}
        className="card-img-top"
        alt={product.nome}
        // Esta linha ajuda a mostrar uma imagem padrão caso a sua não seja encontrada
        onError={(e) => { e.target.onerror = null; e.target.src="https://via.placeholder.com/300?text=Imagem+Nao+Encontrada" }}
      />
      <div className="card-body d-flex flex-column">
        <h5 className="card-title">{product.nome}</h5>
        <p className="card-text text-muted">Estoque: {product.quantidade_estoque}</p>
        <p className="card-text fs-4 fw-bold mt-2">
          R$ {parseFloat(product.preco).toFixed(2)}
        </p>
        <button 
          onClick={(e) => {
            e.preventDefault();
            addToCart(product);
          }}
          disabled={product.quantidade_estoque === 0}
          className="btn btn-dark-custom w-100 mt-auto"
        >
          {product.quantidade_estoque > 0 ? "Adicionar ao Carrinho" : "Esgotado"}
        </button>
      </div>
    </Link>
  );
};

export default ProductCard;