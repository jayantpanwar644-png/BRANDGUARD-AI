import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  elevated?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  elevated = false,
  onClick
}) => {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl border transition-all duration-200 ${
        elevated
          ? 'bg-[#FFFFFF] border-[#E2E8F0] shadow-sm hover:shadow-md'
          : 'bg-[#FFFFFF] border-[#E2E8F0] shadow-xs'
      } ${onClick ? 'cursor-pointer hover:border-[#CBD5E1]' : ''} ${className}`}
    >
      {children}
    </div>
  );
};
