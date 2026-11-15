import React from 'react';

interface BadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ status, size = 'md' }) => {
  const s = status ? status.toLowerCase() : '';

  let bg = 'bg-[#F1F5F9] text-[#64748B] border-[#E2E8F0]';

  if (s === 'passed' || s === 'approved' || s === 'supported' || s === 'resolved' || s === 'verified' || s === 'connected' || s === 'low') {
    bg = 'bg-[#EAF7F1] text-[#239B6B] border-[#BDE7D4]';
  } else if (s === 'needs review' || s === 'pending evidence' || s === 'pending approval' || s === 'changes requested' || s === 'needs human review' || s === 'medium' || s === 'investigating' || s === 'under review' || s === 'needs verification') {
    bg = 'bg-[#FEF6E8] text-[#D99A32] border-[#F9E0B2]';
  } else if (s === 'failed' || s === 'rejected' || s === 'contradicted' || s === 'high' || s === 'active' || s === 'token expired') {
    bg = 'bg-[#FDF0F1] text-[#D85F67] border-[#F7C6CA]';
  } else if (s === 'not verified' || s === 'not configured' || s === 'draft' || s === 'setup required' || s === 'not connected') {
    bg = 'bg-[#F1F5F9] text-[#64748B] border-[#CBD5E1]';
  } else if (s === 'positive') {
    bg = 'bg-[#EAF7F1] text-[#239B6B] border-[#BDE7D4]';
  } else if (s === 'negative') {
    bg = 'bg-[#FDF0F1] text-[#D85F67] border-[#F7C6CA]';
  } else if (s === 'neutral') {
    bg = 'bg-[#F1F5F9] text-[#64748B] border-[#E2E8F0]';
  } else if (s === 'mixed') {
    bg = 'bg-[#F5F0FB] text-[#7C3AED] border-[#DDD0F7]';
  }

  const px = size === 'sm' ? 'px-2 py-0.5 text-[11px] font-semibold' : 'px-2.5 py-1 text-[12px] font-semibold';

  return (
    <span className={`inline-flex items-center rounded-full border ${px} ${bg} tracking-wide`}>
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-90" />
      {status}
    </span>
  );
};
