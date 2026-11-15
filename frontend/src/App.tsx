import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';

import { LandingPage } from './pages/LandingPage';
import { Login } from './pages/Login';
import { OnboardingWizard } from './pages/OnboardingWizard';
import { Overview } from './pages/Overview';
import { CommandCenter } from './pages/CommandCenter';
import { BrandGovernance } from './pages/BrandGovernance';
import { AudienceIntelligence } from './pages/AudienceIntelligence';
import { ReputationRiskCenter } from './pages/ReputationRiskCenter';
import { ContentIntelligence } from './pages/ContentIntelligence';
import { ApprovalCenter } from './pages/ApprovalCenter';
import { BrandKnowledgeHub } from './pages/BrandKnowledgeHub';
import { IntelligenceReports } from './pages/IntelligenceReports';
import { Integrations } from './pages/Integrations';
import { CompanyGuidelines } from './pages/CompanyGuidelines';
import { SettingsPage } from './pages/SettingsPage';

// Protected Route Guard for Application Modules (Allows free navigation without forcing onboarding)
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] flex items-center justify-center text-xs text-[#64748B] font-mono">
        Authenticating enterprise session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Guard for Onboarding Setup
const OnboardingRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] flex items-center justify-center text-xs text-[#64748B] font-mono">
        Authenticating enterprise session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Public/Auth Guard to redirect already logged in users from /login and /register directly to dashboard
const AuthRoute: React.FC<{ children: React.ReactNode; defaultRegister?: boolean }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] flex items-center justify-center text-xs text-[#64748B] font-mono">
        Checking session...
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* 1. Public Default Landing Page (Always opens first for unauthenticated visitors) */}
          <Route path="/" element={<LandingPage />} />

          {/* 2. Authentication Routes */}
          <Route
            path="/login"
            element={
              <AuthRoute>
                <Login />
              </AuthRoute>
            }
          />
          <Route
            path="/register"
            element={
              <AuthRoute defaultRegister>
                <Login defaultRegister />
              </AuthRoute>
            }
          />

          {/* 3. Company Onboarding Wizard */}
          <Route
            path="/onboarding"
            element={
              <OnboardingRoute>
                <OnboardingWizard />
              </OnboardingRoute>
            }
          />
          {/* Legacy setup alias */}
          <Route path="/setup" element={<Navigate to="/onboarding" replace />} />

          {/* 4. Protected Application Routes (/app/*) */}
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<CommandCenter />} />
            <Route path="dashboard" element={<CommandCenter />} />
            <Route path="overview" element={<Overview />} />
            <Route path="command-center" element={<CommandCenter />} />
            <Route path="brand-governance" element={<BrandGovernance />} />
            <Route path="audience-intelligence" element={<AudienceIntelligence />} />
            <Route path="reputation-risk" element={<ReputationRiskCenter />} />
            <Route path="content-history" element={<ContentIntelligence />} />
            <Route path="approvals" element={<ApprovalCenter />} />
            <Route path="approval" element={<Navigate to="/app/approvals" replace />} />
            <Route path="knowledge-hub" element={<BrandKnowledgeHub />} />
            <Route path="reports" element={<IntelligenceReports />} />
            <Route path="integrations" element={<Integrations />} />
            <Route path="guidelines" element={<CompanyGuidelines />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="create" element={<Navigate to="/app/overview" replace />} />
            <Route path="create-publish" element={<Navigate to="/app/overview" replace />} />
          </Route>

          {/* Direct Route Aliases for smooth compatibility */}
          <Route path="/command-center" element={<Navigate to="/app/command-center" replace />} />
          <Route path="/overview" element={<Navigate to="/app/overview" replace />} />
          <Route path="/brand-governance" element={<Navigate to="/app/brand-governance" replace />} />
          <Route path="/audience-intelligence" element={<Navigate to="/app/audience-intelligence" replace />} />
          <Route path="/reputation-risk" element={<Navigate to="/app/reputation-risk" replace />} />
          <Route path="/content-history" element={<Navigate to="/app/content-history" replace />} />
          <Route path="/approvals" element={<Navigate to="/app/approvals" replace />} />
          <Route path="/approval" element={<Navigate to="/app/approvals" replace />} />
          <Route path="/knowledge-hub" element={<Navigate to="/app/knowledge-hub" replace />} />
          <Route path="/reports" element={<Navigate to="/app/reports" replace />} />
          <Route path="/integrations" element={<Navigate to="/app/integrations" replace />} />
          <Route path="/guidelines" element={<Navigate to="/app/guidelines" replace />} />
          <Route path="/settings" element={<Navigate to="/app/settings" replace />} />
          <Route path="/create" element={<Navigate to="/app/overview" replace />} />
          <Route path="/create-publish" element={<Navigate to="/app/overview" replace />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
