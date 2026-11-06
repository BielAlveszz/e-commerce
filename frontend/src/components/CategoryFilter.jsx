import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../services/Api';
import { ChevronDown, ChevronRight } from 'react-bootstrap-icons';

const CategoryFilter = () => {
  const [categorias, setCategorias]       = useState([]);
  const [subCategorias, setSubCategorias] = useState([]);
  const [searchParams]                    = useSearchParams();

  const currentCategory    = searchParams.get('categoria');
  const currentSubCategory = searchParams.get('subcategoria');

  // Estado para controlar quais categorias estão expandidas (acordeão)
  const [expandedCats, setExpandedCats] = useState({});

  useEffect(() => {
    Promise.all([
      apiFetch('/api/categorias'),
      apiFetch('/api/categorias/sub')
    ])
      .then(async ([catRes, subCatRes]) => {
        const cats = await catRes.json();
        setCategorias(cats);
        setSubCategorias(await subCatRes.json());
        
        // Se já existir uma categoria na URL (ex: a cliente recarregou a página), expande-a automaticamente
        if (currentCategory) {
          const activeCat = cats.find(c => c.nome === currentCategory);
          if (activeCat) {
            setExpandedCats({ [activeCat.id]: true });
          }
        }
      })
      .catch(err => console.error('Erro ao buscar filtros:', err));
  }, [currentCategory]);

  const toggleCategory = (categoryId) => {
    setExpandedCats(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  // Função auxiliar para gerar URLs preservando os outros filtros (como minPrice, sort, etc.)
  const createUrlWithParams = (catName, subCatName = null) => {
    const params = new URLSearchParams(searchParams);
    
    // Garante que a view 'all' se mantém
    if (!params.has('view')) params.set('view', 'all');

    if (catName) {
      params.set('categoria', catName);
    } else {
      params.delete('categoria');
    }

    if (subCatName) {
      params.set('subcategoria', subCatName);
    } else {
      params.delete('subcategoria');
    }

    return `/?${params.toString()}`;
  };

  return (
    <div className="category-filter-sidebar">
      <h6 className="fw-bold mb-3 text-muted">CATEGORIAS</h6>
      
      {/* Botão "Todas as Categorias" */}
      <Link 
        to={createUrlWithParams(null, null)} 
        className={`d-block mb-2 text-decoration-none ${!currentCategory ? 'fw-bold text-dark' : 'text-muted'}`}
      >
        Todas as Categorias
      </Link>

      <ul className="list-unstyled mb-0">
        {categorias.map(cat => {
          const isExpanded = expandedCats[cat.id];
          const isActiveCat = currentCategory === cat.nome;
          
          // Filtra as subcategorias que pertencem a esta categoria
          const catSubs = subCategorias.filter(sub => sub.categoria_id === cat.id);
          const hasSubs = catSubs.length > 0;

          return (
            <li key={cat.id} className="mb-2">
              <div className="d-flex justify-content-between align-items-center">
                <Link
                  to={createUrlWithParams(cat.nome, null)}
                  className={`text-decoration-none ${isActiveCat ? 'fw-bold text-dark' : 'text-muted'}`}
                  style={{ transition: 'color 0.2s' }}
                  onMouseOver={(e) => { if(!isActiveCat) e.target.style.color = 'var(--meby-rosa-seco)'; }}
                  onMouseOut={(e) => { if(!isActiveCat) e.target.style.color = '#6c757d'; }}
                >
                  {cat.nome}
                </Link>

                {/* Seta para expandir/recolher as subcategorias, se existirem */}
                {hasSubs && (
                  <button 
                    className="btn btn-sm btn-link text-muted p-0 border-0" 
                    onClick={() => toggleCategory(cat.id)}
                  >
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                )}
              </div>

              {/* Lista de Subcategorias (Acordeão) */}
              {hasSubs && isExpanded && (
                <ul className="list-unstyled ms-3 mt-1 mb-0 border-start ps-2 border-2">
                  {catSubs.map(sub => {
                    const isActiveSub = currentSubCategory === sub.nome;
                    return (
                      <li key={sub.id} className="mb-1 py-1">
                        <Link
                          to={createUrlWithParams(cat.nome, sub.nome)}
                          className={`text-decoration-none small ${isActiveSub ? 'fw-bold text-dark' : 'text-muted'}`}
                          style={{ transition: 'color 0.2s' }}
                          onMouseOver={(e) => { if(!isActiveSub) e.target.style.color = 'var(--meby-rosa-seco)'; }}
                          onMouseOut={(e) => { if(!isActiveSub) e.target.style.color = '#6c757d'; }}
                        >
                          {sub.nome}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default CategoryFilter;