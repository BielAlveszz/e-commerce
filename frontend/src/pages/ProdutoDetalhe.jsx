import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
// REMOVA a importação do Header daqui

const ProdutoDetalhe = () => {
  const [produto, setProduto] = useState(null);
  const [loading, setLoading] = useState(true);
  const { id } = useParams();
  const { addToCart } = useCart();

  useEffect(() => {
    setLoading(true);
    fetch(`http://localhost:3001/api/produtos/${id}`)
      .then(res => res.json())
      .then(data => { setProduto(data); })
      .catch(err => { console.error("Erro:", err); setProduto(null); })
      .finally(() => { setLoading(false); });
  }, [id]);

  if (loading) return <div className="text-center my-5"><h1>Carregando...</h1></div>;
  if (!produto) return <div className="text-center my-5"><h1>Produto não encontrado!</h1></div>;

  return (
    // O <div> e o <Header /> também foram removidos daqui.
    <main className="container my-5">
      <div className="row g-5">
        <div className="col-md-6">
          <img src={`/images/${produto.url_imagem}`} alt={produto.nome} className="img-fluid rounded shadow-sm" />
        </div>
        <div className="col-md-6 d-flex flex-column justify-content-center">
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb">
              <li className="breadcrumb-item"><Link to="/">Home</Link></li>
              <li className="breadcrumb-item active" aria-current="page">{produto.nome}</li>
            </ol>
          </nav>
          <h1 className="display-5">{produto.nome}</h1>
          <p className="fs-3 fw-bold text-dark">R$ {parseFloat(produto.preco).toFixed(2)}</p>
          <p className="lead">{produto.descricao}</p>
          <p className="text-muted">Em estoque: {produto.quantidade_estoque}</p>
          <div className="d-grid gap-2 mt-4">
            <button className="btn btn-dark-custom btn-lg" onClick={() => addToCart(produto)} disabled={produto.quantidade_estoque === 0}>
              {produto.quantidade_estoque > 0 ? "Adicionar ao Carrinho" : "Esgotado"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ProdutoDetalhe;