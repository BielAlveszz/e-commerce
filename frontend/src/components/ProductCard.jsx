const ProductCard = ({ product, onAddToCart }) => {
  // Agora, a URL da imagem é construída de forma simples.
  // Tudo que está na pasta `public` pode ser acessado diretamente com a barra '/'.
  const imageUrl = `/images/${product.url_imagem}`;

  return (
    <div className="card h-100 border-0 product-card">
      <img 
        src={imageUrl} // Usamos a nova URL aqui!
        className="card-img-top"
        alt={product.nome}
        // Adiciona uma imagem padrão em caso de erro
        onError={(e) => { e.target.onerror = null; e.target.src="https://via.placeholder.com/300?text=Imagem+Indisponível" }}
      />
      <div className="card-body d-flex flex-column">
        <h5 className="card-title">{product.nome}</h5>
        <p className="card-text text-muted">Estoque: {product.quantidade_estoque}</p>
        <p className="card-text fs-4 fw-bold text-dark mt-2">
          R$ {parseFloat(product.preco).toFixed(2)}
        </p>
        <button 
          onClick={() => onAddToCart(product)}
          disabled={product.quantidade_estoque === 0}
          className="btn btn-dark-custom w-100 mt-auto"
        >
          {product.quantidade_estoque > 0 ? "Adicionar ao Carrinho" : "Esgotado"}
        </button>
      </div>
    </div>
  );
};

export default ProductCard;