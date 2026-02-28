import React from 'react';
import './Card.css';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: 'default' | 'elevated' | 'outlined';
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  onClick,
  variant = 'default',
}) => {
  return (
    <div
      className={`card card-${variant} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default Card;

