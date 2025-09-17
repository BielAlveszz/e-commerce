import { useState, useEffect } from "react";
import { useLocation } from 'react-router-dom';
import Hero from "../components/Hero";
import CategoryFilter from "../components/CategoryFilter";
import ProductGrid from "../components/ProductGrid";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const Index = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageTitle, setPageTitle] = useState("");

  const query = useQuery();
  const view = query.get('view');
  const isOnSale = query.get('ofertas') === 'true';
  const categoryTerm = query.get('categoria');
  const subCategoryTerm = query.get('subcategoria');
  const searchTerm = query.get('search');

  useEffect(() => {
    setLoading(true);
    let apiUrl = '';
    let title = '';
    const params = new URLSearchParams();

    if (isOnSale) {
      apiUrl = 'http://localhost:3001/api/produtos/ofertas';
      title = "Produtos em Oferta";
    } else if (view === 'all' || categoryTerm || subCategoryTerm || searchTerm) {
      if (categoryTerm) params.append('categoria', categoryTerm);
      if (subCategoryTerm) params.append('subcategoria', subCategoryTerm);
      if (searchTerm) params.append('search', searchTerm);
      
      // AQUI ESTÁ A CORREÇÃO: A URL é construída DEPOIS de adicionar os parâmetros
      apiUrl = `http://localhost:3001/api/produtos?${params.toString()}`;
      title = "Nossos Produtos";
    } else {
      apiUrl = 'http://localhost:3001/api/produtos/bestsellers';
      title = "Nossos Queridinhos ✨";
    }
    
    setPageTitle(title);

    fetch(apiUrl)
      .then(response => response.json())
      .then(data => {
        setProducts(data.products || []);
      })
      .catch(error => console.error("Erro ao buscar produtos:", error))
      .finally(() => setLoading(false));
      
  }, [view, isOnSale, categoryTerm, subCategoryTerm, searchTerm]);

  const showHero = !view && !isOnSale && !categoryTerm && !subCategoryTerm && !searchTerm;
  const showFilters = view === 'all' || categoryTerm || subCategoryTerm;

  return (
    <>
      {showHero && <Hero />}

      <main className="container my-5">
        <div className="text-center">
            <h2 className="mb-4">{pageTitle}</h2>
            {showFilters && <CategoryFilter currentView={view} />}
        </div>
        
        <ProductGrid products={products} loading={loading} />
      </main>
    </>
  );
};

export default Index;