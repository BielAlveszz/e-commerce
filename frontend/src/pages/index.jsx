import { useState, useEffect } from "react";
import { useLocation } from 'react-router-dom';
import Hero from "../components/Hero";
import CategoryFilter from "../components/CategoryFilter";
import ProductGrid from "../components/ProductGrid";
import { API_URL, apiFetch } from '../services/Api';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const Index = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageTitle, setPageTitle] = useState("");
  const [fetchError, setFetchError] = useState(false);

  const query = useQuery();
  const view = query.get('view');
  const isOnSale = query.get('ofertas') === 'true';
  const categoryTerm = query.get('categoria');
  const subCategoryTerm = query.get('subcategoria');
  const searchTerm = query.get('search');

  useEffect(() => {
    setLoading(true);
    setFetchError(false);
    let apiUrl = '';
    let title = '';
    const params = new URLSearchParams();

    if (isOnSale) {
      apiUrl = `${API_URL}/api/produtos/ofertas`;
      title = "Produtos em Oferta";
    } else if (view === 'all' || categoryTerm || subCategoryTerm || searchTerm) {
      if (categoryTerm) params.append('categoria', categoryTerm);
      if (subCategoryTerm) params.append('subcategoria', subCategoryTerm);
      if (searchTerm) params.append('search', searchTerm);
      apiUrl = `${API_URL}/api/produtos?${params.toString()}`;
      title = searchTerm ? `Resultados para "${searchTerm}"` : "Nossos Produtos";
    } else {
      apiUrl = `${API_URL}/api/produtos/destaques`;
      title = "Nossos Queridinhos ✨";
    }

    setPageTitle(title);

    // Para rotas públicas sem autenticação, usamos apiFetch para consistência (credentials não obrigatório)
    fetch(apiUrl, { credentials: 'include' })
      .then(res => {
        if (!res.ok) throw new Error('Erro ao buscar produtos');
        return res.json();
      })
      .then(data => setProducts(data.products || []))
      .catch(error => {
        console.error("Erro ao buscar produtos:", error);
        setFetchError(true);
        setProducts([]);
      })
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
        {fetchError ? (
          <div className="alert alert-warning text-center mt-4">
            Não foi possível carregar os produtos. Verifique sua conexão e tente novamente.
          </div>
        ) : (
          <ProductGrid products={products} loading={loading} />
        )}
      </main>
    </>
  );
};

export default Index;