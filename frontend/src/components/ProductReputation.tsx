import React from 'react';
import './ProductReputation.css';

interface ProductReputationProps {
  averageRating?: number;
  totalReviews?: number;
  size?: 'small' | 'medium' | 'large';
  showCount?: boolean;
}

export const ProductReputation: React.FC<ProductReputationProps> = ({
  averageRating = 0,
  totalReviews = 0,
  size = 'medium',
  showCount = true
}) => {
  // Se não tem avaliações
  if (!averageRating || averageRating === 0 || !totalReviews || totalReviews === 0) {
    return (
      <div className={`product-reputation product-reputation--no-rating product-reputation--${size}`}>
        <span className="reputation-no-reviews">Sem avaliações</span>
      </div>
    );
  }

  // Calcular estrelas cheias e vazias
  const fullStars = Math.round(averageRating);
  const emptyStars = 5 - fullStars;

  const sizeClass = `product-reputation--${size}`;

  return (
    <div className={`product-reputation ${sizeClass}`}>
      <div className="reputation-stars">
        {/* Estrelas cheias */}
        {Array.from({ length: fullStars }).map((_, i) => (
          <span key={`full-${i}`} className="star star--full">★</span>
        ))}
        {/* Estrelas vazias */}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <span key={`empty-${i}`} className="star star--empty">☆</span>
        ))}
      </div>

      <div className="reputation-info">
        <span className="reputation-rating">{averageRating.toFixed(1)}</span>
        {showCount && (
          <span className="reputation-count">({totalReviews} avaliações)</span>
        )}
      </div>
    </div>
  );
};

export default ProductReputation;
