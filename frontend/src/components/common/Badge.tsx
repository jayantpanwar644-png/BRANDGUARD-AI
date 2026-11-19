import React from 'react';

interface BadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ status, size = 'md' }) => {
  const s = status ? status.toLowerCase() : '';

  let bg = 'bg-[#EFECE2] text-[#68736B] border-[#E4DFD5]';

  if (s === 'passed' || s === 'approved' || s === 'supported' || s === 'resolved' || s === 'verified' || s === 'connected' || s === 'low') {
    bg = 'bg-[#EBF0ED] text-[#244B3F] border-[#C8D7CF]';
  } else if (s === 'needs review' || s === 'pending evidence' || s === 'pending approval' || s === 'changes requested' || s === 'needs human review' || s === 'medium' || s === 'investigating' || s === 'under review' || s === 'needs verification') {
    bg = 'bg-[#F9F5EC] text-[#9E7A3E] border-[#E7DBC5]';
  } else if (s === 'failed' || s === 'rejected' || s === 'contradicted' || s === 'high' || s === 'active' || s === 'token expired') {
    bg = 'bg-[#FAF0EC] text-[#B85E42] border-[#ECCBC0]';
  } else if (s === 'not verified' || s === 'not configured' || s === 'draft' || s === 'setup required' || s === 'not connected') {
    bg = 'bg-[#EFECE2] text-[#68736B] border-[#E4DFD5]';
  } else if (s === 'positive') {
    bg = 'bg-[#EBF0ED] text-[#244B3F] border-[#C8D7CF]';
  } else if (s === 'negative') {
    bg = 'bg-[#FAF0EC] text-[#B85E42] border-[#ECCBC0]';
  } else if (s === 'neutral') {
    bg = 'bg-[#EFECE2] text-[#68736B] border-[#E4DFD5]';
  } else if (s === 'mixed') {
    bg = 'bg-[#F3EFE8] text-[#7A6A55] border-[#E2D8C9]';
  }

  const px = size === 'sm' ? 'px-2 py-0.5 text-[11px] font-semibold' : 'px-2.5 py-1 text-[12px] font-semibold';

  return (
    <span className={`inline-flex items-center rounded-full border ${px} ${bg} tracking-wide transition-colors duration-150`}>
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-85" />
      {status}
    </span>
  );
};
