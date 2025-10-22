import React from 'react';
import ProductCard from './ProductCard';
import ProductCardSkeleton from './ProductCardSkeleton'; // 1. Importe o esqueleto

const ProductGrid = ({ products, loading }) => {
  // 2. Se estiver carregando, mostra uma grade de 8 esqueletos
  if (loading) {
    return (
      <div className="row g-4 mt-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="col-12 col-md-6 col-lg-3">
            <ProductCardSkeleton />
          </div>
        ))}
      </div>
    );
  }

  if (!products || products.length === 0) {
    return <p className="text-center text-muted mt-5">Nenhum produto encontrado.</p>;
  }

  // 3. Se não estiver carregando, mostra os produtos reais
  return (
    <div className="row g-4 mt-4">
      {products.map(product => (
        <div key={product.id} className="col-12 col-md-6 col-lg-3 d-flex align-items-stretch">
          <ProductCard product={product} />
        </div>
      ))}
    </div>
  );
};

export default ProductGrid;