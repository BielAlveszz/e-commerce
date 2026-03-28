import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../services/Api';

const CategoryFilter = ({ currentView }) => {
  const [categorias, setCategorias]       = useState([]);
  const [subCategorias, setSubCategorias] = useState([]);
  const [searchParams]                    = useSearchParams();

  const currentCategory    = searchParams.get('categoria');
  const currentSubCategory = searchParams.get('subcategoria');

  useEffect(() => {
    Promise.all([
      apiFetch('/api/categorias'),
      apiFetch('/api/categorias/sub')
    ])
      .then(async ([catRes, subCatRes]) => {
        setCategorias(await catRes.json());
        setSubCategorias(await subCatRes.json());
      })
      .catch(err => console.error('Erro ao buscar filtros:', err));
  }, []);

  const selectedCategoryId = categorias.find(c => c.nome === currentCategory)?.id;
  const baseUrl = (currentView === 'all' || currentCategory) ? '/?view=all' : '/';

  return (
    <div className="container mb-5 category-filter-wrapper">
      <div className="d-flex justify-content-center flex-wrap gap-2">
        <Link to={baseUrl} className={`btn ${!currentCategory ? 'btn-dark-custom' : 'btn-outline-custom'}`}>
          Todos
        </Link>
        {categorias.map(cat => (
          <Link
            key={cat.id}
            to={`${baseUrl}&categoria=${encodeURIComponent(cat.nome)}`}
            className={`btn ${currentCategory === cat.nome ? 'btn-dark-custom' : 'btn-outline-custom'}`}
          >
            {cat.nome}
          </Link>
        ))}
      </div>

      {selectedCategoryId && (
        <div className="d-flex justify-content-center flex-wrap gap-2 mt-3 pt-3"
          style={{ borderTop: '1px solid var(--meby-rosa-claro)' }}>
          {subCategorias
            .filter(sub => sub.categoria_id === selectedCategoryId)
            .map(sub => (
              <Link
                key={sub.id}
                to={`${baseUrl}&categoria=${encodeURIComponent(currentCategory)}&subcategoria=${encodeURIComponent(sub.nome)}`}
                className={`btn btn-sm ${currentSubCategory === sub.nome ? 'btn-dark-custom' : 'btn-outline-custom'}`}
              >
                {sub.nome}
              </Link>
            ))}
        </div>
      )}
    </div>
  );
};

export default CategoryFilter;