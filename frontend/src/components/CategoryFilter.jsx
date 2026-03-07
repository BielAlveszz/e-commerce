import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

const CategoryFilter = ({ currentView }) => {
    const [categorias, setCategorias] = useState([]);
    const [subCategorias, setSubCategorias] = useState([]);
    const [searchParams] = useSearchParams();
    
    const currentCategory = searchParams.get('categoria');
    const currentSubCategory = searchParams.get('subcategoria');

    useEffect(() => {
        const fetchFilters = async () => {
            try {
                const [catRes, subCatRes] = await Promise.all([
                    fetch('http://localhost:3001/api/categorias'),
                    fetch('http://localhost:3001/api/categorias/sub')
                ]);
                const catData = await catRes.json();
                const subCatData = await subCatRes.json();
                setCategorias(catData);
                setSubCategorias(subCatData);
            } catch (error) {
                console.error("Erro ao buscar filtros:", error);
            }
        };
        fetchFilters();
    }, []);

    const selectedCategoryId = categorias.find(c => c.nome === currentCategory)?.id;

    // Constrói a URL base para os links, mantendo o ?view=all se necessário
    const baseUrl = (currentView === 'all' || currentCategory) ? '/?view=all' : '/';

    return (
        <div className="container mb-5">
            <div className="d-flex justify-content-center flex-wrap gap-2">
                <Link to={baseUrl} className={`btn ${!currentCategory ? 'btn-dark-custom' : 'btn-outline-custom'}`}>
                    Todos
                </Link>
                {categorias.map(categoria => (
                    <Link 
                        key={categoria.id} 
                        to={`${baseUrl}&categoria=${categoria.nome}`}
                        className={`btn ${currentCategory === categoria.nome ? 'btn-dark-custom' : 'btn-outline-custom'}`}
                    >
                        {categoria.nome}
                    </Link>
                ))}
            </div>

            {selectedCategoryId && (
                <div className="d-flex justify-content-center flex-wrap gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--meby-rosa-claro)' }}>
                    {subCategorias
                        .filter(sub => sub.categoria_id === selectedCategoryId)
                        .map(sub => (
                            <Link
                                key={sub.id}
                                to={`${baseUrl}&categoria=${currentCategory}&subcategoria=${sub.nome}`}
                                className={`btn btn-sm ${currentSubCategory === sub.nome ? 'btn-dark-custom' : 'btn-outline-custom'}`}
                            >
                                {sub.nome}
                            </Link>
                        ))
                    }
                </div>
            )}
        </div>
    );
};

export default CategoryFilter;
