import React from 'react';
import ProductCard from './ProductCard';

const ProductGrid = ({ products, loading }) => {
  if (loading) {
    return <p className="text-center">Carregando...</p>;
  }

  if (!products || products.length === 0) {
    return <p className="text-center text-muted">Nenhum produto encontrado.</p>;
  }

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