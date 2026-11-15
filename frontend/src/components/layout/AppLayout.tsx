import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Aurora } from '../ui/aurora';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { BrandGuardAIAssistant } from '../chat/BrandGuardAIAssistant';

export const AppLayout: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-[#F7F9FC] text-[#172033] relative overflow-hidden">
      {/* Light Theme Ambient Subtle Aurora Background */}
      <Aurora
        asBackgroundOnly
        className="fixed inset-0 pointer-events-none z-0"
        colors={['#183B59', '#315C76', '#263A52']}
        duration={32}
        intensity={0.06}
      />

      <Header />

      <div className="flex flex-1 min-h-0 overflow-hidden relative z-10">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-[#F7F9FC] p-6 lg:p-8">
          <ErrorBoundary fallbackTitle="Governance Workspace Error">
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      {/* Floating AI Chat Assistant & BrandGuard Copilot */}
      <BrandGuardAIAssistant />
    </div>
  );
};
