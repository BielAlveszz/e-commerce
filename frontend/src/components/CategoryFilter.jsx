import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

const CategoryFilter = () => {
    const [categorias, setCategorias] = useState([]);
    const [subCategorias, setSubCategorias] = useState([]);
    const [searchParams] = useSearchParams();
    
    const currentCategory = searchParams.get('categoria');
    const currentSubCategory = searchParams.get('subcategoria');

    // Busca as categorias e sub-categorias da API
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

    // Encontra o ID da categoria principal selecionada atualmente
    const selectedCategoryId = categorias.find(c => c.nome === currentCategory)?.id;

    return (
        <div className="container mb-5">
            {/* Filtros de Categoria Principal */}
            <div className="d-flex justify-content-center flex-wrap gap-2">
                <Link to="/" className={`btn ${!currentCategory ? 'btn-dark' : 'btn-outline-dark'}`}>
                    Todos
                </Link>
                {categorias.map(categoria => (
                    <Link 
                        key={categoria.id} 
                        to={`/?categoria=${categoria.nome}`}
                        className={`btn ${currentCategory === categoria.nome ? 'btn-dark' : 'btn-outline-dark'}`}
                    >
                        {categoria.nome}
                    </Link>
                ))}
            </div>

            {/* Filtros de Sub-Categoria (só aparecem se uma categoria principal for selecionada) */}
            {selectedCategoryId && (
                <div className="d-flex justify-content-center flex-wrap gap-2 mt-3 pt-3 border-top">
                    {subCategorias
                        .filter(sub => sub.categoria_id === selectedCategoryId)
                        .map(sub => (
                            <Link
                                key={sub.id}
                                to={`/?categoria=${currentCategory}&subcategoria=${sub.nome}`}
                                className={`btn btn-sm ${currentSubCategory === sub.nome ? 'btn-secondary' : 'btn-outline-secondary'}`}
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