import React from 'react';
import Skeleton from 'react-loading-skeleton';

const ProductCardSkeleton = () => {
  return (
    <div className="card h-100 border-0">
      {/* Esqueleto da Imagem */}
      <Skeleton height={280} />
      <div className="card-body d-flex flex-column">
        {/* Esqueleto do Título */}
        <h5 className="card-title">
          <Skeleton width={`80%`} />
        </h5>
        {/* Esqueleto do Estoque */}
        <p className="card-text text-muted">
          <Skeleton width={`50%`} />
        </p>
        
        <div className="mt-auto">
          {/* Esqueleto do Preço */}
          <p className="card-text fs-4 fw-bold">
            <Skeleton width={`60%`} />
          </p>
          {/* Esqueleto do Botão */}
          <Skeleton height={48} style={{ marginTop: '8px' }} />
        </div>
      </div>
    </div>
  );
};

export default ProductCardSkeleton;