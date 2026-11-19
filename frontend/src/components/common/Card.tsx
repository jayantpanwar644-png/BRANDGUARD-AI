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
      className={`rounded-2xl border transition-all duration-200 ${
        elevated
          ? 'bg-[#FCFAF5] border-[#E4DFD5] shadow-[0_4px_20px_rgba(36,43,39,0.06)] hover:shadow-[0_6px_24px_rgba(36,43,39,0.09)] hover:-translate-y-0.5'
          : 'bg-[#FCFAF5] border-[#E4DFD5] shadow-[0_1px_3px_rgba(36,43,39,0.03),0_2px_8px_rgba(36,43,39,0.02)] hover:border-[#D6CEBF]'
      } ${onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(36,43,39,0.06)] active:scale-[0.99]' : ''} ${className}`}
    >
      {children}
    </div>
  );
};
