import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-2xl'
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'auto';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#242B27]/40 backdrop-blur-xs animate-in fade-in duration-150 font-sans">
      <div className={`w-full ${maxWidth} bg-[#FCFAF5] border border-[#E4DFD5] rounded-3xl shadow-[0_20px_60px_rgba(36,43,39,0.18)] flex flex-col max-h-[90vh] overflow-hidden`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E4DFD5] bg-[#F7F4EC]">
          <h3 className="text-base font-normal text-[#242B27] font-heading">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#68736B] hover:text-[#242B27] hover:bg-[#EFECE2] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1 text-[#242B27]">
          {children}
        </div>
      </div>
    </div>
  );
};
