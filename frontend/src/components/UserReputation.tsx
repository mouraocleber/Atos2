import React from 'react';
import './UserReputation.css';

interface UserReputationProps {
  averageRating?: number;
  totalReviews?: number;
  ratingLevel?: string;
  size?: 'small' | 'medium' | 'large';
}

export const UserReputation: React.FC<UserReputationProps> = ({
  averageRating = 0,
  totalReviews = 0,
  ratingLevel,
  size = 'medium'
}) => {
  // Se não tem avaliações
  if (!averageRating || averageRating === 0 || !totalReviews || totalReviews === 0) {
    return (
      <div className={`user-reputation user-reputation--no-rating user-reputation--${size}`}>
        <span className="reputation-no-reviews">Sem avaliações</span>
      </div>
    );
  }

  // Calcular estrelas cheias e vazias
  const fullStars = Math.round(averageRating);
  const emptyStars = 5 - fullStars;

  const sizeClass = `user-reputation--${size}`;

  return (
    <div className={`user-reputation ${sizeClass}`}>
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
        <span className="reputation-count">({totalReviews} avaliações)</span>
        {ratingLevel && (
          <span className={`reputation-badge reputation-badge--${ratingLevel.toLowerCase()}`}>
            {ratingLevel}
          </span>
        )}
      </div>
    </div>
  );
};

export default UserReputation;
