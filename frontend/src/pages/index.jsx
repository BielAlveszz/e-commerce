import { useState, useEffect } from "react";
import { useLocation } from 'react-router-dom';
import Hero from "../components/Hero";
import ProductCard from "../components/ProductCard";
import CategoryFilter from "../components/CategoryFilter";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const Index = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const query = useQuery();
  const searchTerm = query.get('search');
  const categoryTerm = query.get('categoria');
  const subCategoryTerm = query.get('subcategoria');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (searchTerm) params.append('search', searchTerm);
    if (categoryTerm) params.append('categoria', categoryTerm);
    if (subCategoryTerm) params.append('subcategoria', subCategoryTerm);
    
    // Para a loja, podemos pedir mais itens por página, por exemplo, 20.
    params.append('limit', '20'); 

    const apiUrl = `http://localhost:3001/api/produtos?${params.toString()}`;

    fetch(apiUrl)
      .then(response => response.json())
      .then(data => {
        // A CORREÇÃO ESTÁ AQUI:
        // Agora, em vez de usar 'data' diretamente, nós pegamos 'data.products'.
        setProducts(data.products || []); // Garante que products seja sempre um array
      })
      .catch(error => console.error("Erro ao buscar produtos:", error))
      .finally(() => setLoading(false));
      
  }, [searchTerm, categoryTerm, subCategoryTerm]);

  const getPageTitle = () => {
    if (searchTerm) return `Resultados para "${searchTerm}"`;
    if (subCategoryTerm) return `${categoryTerm} / ${subCategoryTerm}`;
    if (categoryTerm) return `Mostrando produtos de "${categoryTerm}"`;
    return "Nossos Produtos";
  };

  return (
    <>
      {!searchTerm && !categoryTerm && !subCategoryTerm && <Hero />}

      <main className="container my-5">
        <div className="text-center">
            <h2 className="mb-4">{getPageTitle()}</h2>
            <CategoryFilter />
        </div>
        
        {loading ? (
          <p className="text-center">Carregando...</p>
        ) : (
          <div className="row g-4 mt-4">
            {products.length > 0 ? (
              products.map(product => (
                <div key={product.id} className="col-12 col-md-6 col-lg-3 d-flex align-items-stretch">
                  <ProductCard product={product} />
                </div>
              ))
            ) : (
              <p className="text-center text-muted">Nenhum produto encontrado para os filtros selecionados.</p>
            )}
          </div>
        )}
        {/* Futuramente, podemos adicionar um botão "Carregar mais" ou paginação aqui também */}
      </main>
    </>
  );
};

export default Index;