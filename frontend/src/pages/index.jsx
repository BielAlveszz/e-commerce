import { useState, useEffect } from "react";
import { useSearchParams } from 'react-router-dom';
import Hero from "../components/Hero";
import CategoryFilter from "../components/CategoryFilter";
import ProductGrid from "../components/ProductGrid";
import { API_URL } from '../services/Api';

// ─────────────────────────────────────────────────────────────────
// CACHE EM MEMÓRIA ATUALIZADO (Guarda os produtos e o total de páginas)
// ─────────────────────────────────────────────────────────────────
const memoryCache = {};
const TEMPO_CACHE = 5 * 60 * 1000;

const Index = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageTitle, setPageTitle] = useState("");
  const [fetchError, setFetchError] = useState(false);
  
  // NOVO: Estado para armazenar o total de páginas devolvido pelo banco
  const [totalPages, setTotalPages] = useState(1);

  const [searchParams, setSearchParams] = useSearchParams();

  const view = searchParams.get('view');
  const isOnSale = searchParams.get('ofertas') === 'true';
  const categoryTerm = searchParams.get('categoria');
  const subCategoryTerm = searchParams.get('subcategoria');
  const searchTerm = searchParams.get('search');
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const sort = searchParams.get('sort') || 'mais_recentes';
  
  // NOVO: Captura a página atual a partir do URL (padrão é 1)
  const page = parseInt(searchParams.get('page') || '1', 10);

  const [minPriceInput, setMinPriceInput] = useState(minPrice);
  const [maxPriceInput, setMaxPriceInput] = useState(maxPrice);

  useEffect(() => {
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
      if (minPrice) params.append('minPrice', minPrice);
      if (maxPrice) params.append('maxPrice', maxPrice);
      if (sort) params.append('sort', sort);
      
      // NOVO: Envia a página pretendida para a API do Backend
      params.append('page', page);

      apiUrl = `${API_URL}/api/produtos?${params.toString()}`;
      title = searchTerm ? `Resultados para "${searchTerm}"` : "Nossos Produtos";
    } else {
      apiUrl = `${API_URL}/api/produtos/destaques`;
      title = "Nossos Queridinhos ✨";
    }

    setPageTitle(title);
    
    const cacheKey = apiUrl;
    const cacheValido = memoryCache[cacheKey] && (Date.now() - memoryCache[cacheKey].timestamp < TEMPO_CACHE);

    if (cacheValido) {
      // Recupera ambos os dados do cache para não quebrar a paginação
      setProducts(memoryCache[cacheKey].products);
      setTotalPages(memoryCache[cacheKey].totalPages);
      setLoading(false);
      setFetchError(false);
      return; 
    }

    setLoading(true);
    setFetchError(false);

    fetch(apiUrl, { credentials: 'include' })
      .then(res => {
        if (!res.ok) throw new Error('Erro ao buscar produtos');
        return res.json();
      })
      .then(data => {
        const produtosBuscados = data.products || [];
        const totalPaginasBanco = data.totalPages || 1;
        
        setProducts(produtosBuscados);
        setTotalPages(totalPaginasBanco);
        
        // Atualiza a estrutura do cache em memória
        memoryCache[cacheKey] = {
          products: produtosBuscados,
          totalPages: totalPaginasBanco,
          timestamp: Date.now()
        };
      })
      .catch(error => {
        console.error("Erro ao buscar produtos:", error);
        setFetchError(true);
        setProducts([]);
        setTotalPages(1);
      })
      .finally(() => setLoading(false));

  }, [view, isOnSale, categoryTerm, subCategoryTerm, searchTerm, minPrice, maxPrice, sort, page]);

  // ─────────────────────────────────────────────────────────────────
  // FUNÇÕES DE AÇÃO DOS FILTROS
  // ─────────────────────────────────────────────────────────────────
  const handleApplyPriceFilter = (e) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    
    // Sempre que aplicamos um filtro novo, reiniciamos para a página 1
    newParams.set('page', '1');
    
    if (minPriceInput) newParams.set('minPrice', minPriceInput);
    else newParams.delete('minPrice');
    
    if (maxPriceInput) newParams.set('maxPrice', maxPriceInput);
    else newParams.delete('maxPrice');
    
    setSearchParams(newParams);
  };

  const handleSortChange = (e) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', '1'); // Reinicia para a página 1
    newParams.set('sort', e.target.value);
    setSearchParams(newParams);
  };

  const handleClearFilters = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', '1');
    newParams.delete('minPrice');
    newParams.delete('maxPrice');
    newParams.delete('sort');
    newParams.delete('categoria');    
    newParams.delete('subcategoria'); 
    setMinPriceInput('');
    setMaxPriceInput('');
    setSearchParams(newParams);
  };

  // NOVO: Função para alterar de página e rolar o ecrã para o topo suavemente
  const handlePageChange = (newPage) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', newPage.toString());
    setSearchParams(newParams);
    
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const showHero = !view && !isOnSale && !categoryTerm && !subCategoryTerm && !searchTerm;
  const showFilters = view === 'all' || categoryTerm || subCategoryTerm || searchTerm;

  return (
    <>
      {showHero && <Hero />}
      <main className="container my-5">
        <div className="text-center mb-4">
          <h2>{pageTitle}</h2>
        </div>

        {fetchError ? (
          <div className="alert alert-warning text-center mt-4">
            Não foi possível carregar os produtos. Verifique sua conexão e tente novamente.
          </div>
        ) : (
          <div className="row g-4">
            
            {/* Barra Lateral de Filtros */}
            {showFilters && (
              <aside className="col-12 col-lg-3">
                <div className="card shadow-sm border-0 sticky-top" style={{ top: '80px', zIndex: 1 }}>
                  <div className="card-body">
                    <CategoryFilter />

                    <hr className="my-4 text-muted" />

                    <h6 className="fw-bold mb-3 text-muted">FILTRAR POR PREÇO</h6>
                    <form onSubmit={handleApplyPriceFilter} className="mb-4">
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <input 
                          type="number" 
                          className="form-control form-control-sm" 
                          placeholder="Mín (R$)" 
                          value={minPriceInput}
                          onChange={(e) => setMinPriceInput(e.target.value)}
                          min="0"
                        />
                        <span className="text-muted">-</span>
                        <input 
                          type="number" 
                          className="form-control form-control-sm" 
                          placeholder="Máx (R$)" 
                          value={maxPriceInput}
                          onChange={(e) => setMaxPriceInput(e.target.value)}
                          min="0"
                        />
                      </div>
                      <button type="submit" className="btn btn-dark-custom btn-sm w-100">
                        Aplicar Faixa
                      </button>
                    </form>

                    <h6 className="fw-bold mb-3 text-muted">ORDENAR POR</h6>
                    <select 
                      className="form-select form-select-sm mb-4" 
                      value={sort} 
                      onChange={handleSortChange}
                    >
                      <option value="mais_recentes">Mais Recentes</option>
                      <option value="menor_preco">Menor Preço</option>
                      <option value="maior_preco">Maior Preço</option>
                    </select>

                    {(minPrice || maxPrice || sort !== 'mais_recentes' || categoryTerm || page > 1) && (
                      <button 
                        className="btn btn-outline-secondary btn-sm w-100" 
                        onClick={handleClearFilters}
                      >
                        Limpar Todos os Filtros
                      </button>
                    )}
                  </div>
                </div>
              </aside>
            )}

            {/* Grelha de Produtos + Componente de Paginação */}
            <div className={showFilters ? "col-12 col-lg-9" : "col-12"}>
              <div className="d-flex justify-content-between align-items-center mb-3">
                {showFilters && !loading && (
                  <small className="text-muted">
                    Página {page} de {totalPages}
                  </small>
                )}
              </div>
              
              <ProductGrid products={products} loading={loading} />

              {/* ───────────────────────────────────────────────────────
                  NOVO: COMPONENTE VISUAL DE PAGINAÇÃO (BOOTSTRAP)
              ─────────────────────────────────────────────────────── */}
              {!loading && totalPages > 1 && (
                <nav aria-label="Navegação de páginas" className="d-flex justify-content-center mt-5">
                  <ul className="pagination shadow-sm">
                    {/* Botão Anterior */}
                    <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
                      <button 
                        className="page-link text-dark fw-bold" 
                        onClick={() => handlePageChange(page - 1)}
                        disabled={page <= 1}
                      >
                        &laquo; Anterior
                      </button>
                    </li>

                    {/* Números das Páginas */}
                    {Array.from({ length: totalPages }).map((_, index) => {
                      const pageNum = index + 1;
                      return (
                        <li 
                          key={pageNum} 
                          className={`page-item ${page === pageNum ? 'active' : ''}`}
                        >
                          <button 
                            className={`page-link ${page === pageNum ? 'bg-dark border-dark text-white' : 'text-dark'}`}
                            onClick={() => handlePageChange(pageNum)}
                          >
                            {pageNum}
                          </button>
                        </li>
                      );
                    })}

                    {/* Botão Próxima */}
                    <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
                      <button 
                        className="page-link text-dark fw-bold" 
                        onClick={() => handlePageChange(page + 1)}
                        disabled={page >= totalPages}
                      >
                        Próxima &raquo;
                      </button>
                    </li>
                  </ul>
                </nav>
              )}
            </div>
          </div>
        )}
      </main>
    </>
  );
};

export default Index;