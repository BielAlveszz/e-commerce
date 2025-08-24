import { useState, useEffect } from "react";
import { useLocation } from 'react-router-dom';
import Hero from "../components/Hero";
import ProductCard from "../components/ProductCard";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const Index = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const query = useQuery();
  const searchTerm = query.get('search');

  useEffect(() => {
    setLoading(true);
    const apiUrl = searchTerm 
      ? `http://localhost:3001/api/produtos?search=${searchTerm}`
      : 'http://localhost:3001/api/produtos';

    fetch(apiUrl)
      .then(response => response.json())
      .then(data => {
        setProducts(data);
        setLoading(false);
      })
      .catch(error => {
        console.error("Erro ao buscar produtos:", error);
        setLoading(false);
      });
  }, [searchTerm]);

  return (
    <>
      {/* CORREÇÃO: O Hero só será renderizado se NÃO houver um termo de busca */}
      {!searchTerm && <Hero />}

      <main className="container my-5">
        <h2 className="text-center mb-4">
          {searchTerm ? `Resultados para "${searchTerm}"` : "Nossos Produtos"}
        </h2>
        {loading ? (
          <p className="text-center">Carregando...</p>
        ) : (
          <div className="row g-4">
            {products.length > 0 ? (
              products.map(product => (
                <div key={product.id} className="col-12 col-md-6 col-lg-3 d-flex align-items-stretch">
                  <ProductCard product={product} />
                </div>
              ))
            ) : (
              <p className="text-center text-muted">Nenhum produto encontrado.</p>
            )}
          </div>
        )}
      </main>
    </>
  );
};

export default Index;