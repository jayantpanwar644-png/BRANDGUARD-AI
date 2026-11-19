import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';

// Direct synchronous import for Instant First-Contentful Paint of Public Landing Page
import { LandingPage } from './pages/LandingPage';

// Code-split dynamic route imports for fast loading & minimal initial bundle
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const OnboardingWizard = lazy(() => import('./pages/OnboardingWizard').then(m => ({ default: m.OnboardingWizard })));
const Overview = lazy(() => import('./pages/Overview').then(m => ({ default: m.Overview })));
const CommandCenter = lazy(() => import('./pages/CommandCenter').then(m => ({ default: m.CommandCenter })));
const BrandGovernance = lazy(() => import('./pages/BrandGovernance').then(m => ({ default: m.BrandGovernance })));
const AudienceIntelligence = lazy(() => import('./pages/AudienceIntelligence').then(m => ({ default: m.AudienceIntelligence })));
const ReputationRiskCenter = lazy(() => import('./pages/ReputationRiskCenter').then(m => ({ default: m.ReputationRiskCenter })));
const ContentIntelligence = lazy(() => import('./pages/ContentIntelligence').then(m => ({ default: m.ContentIntelligence })));
const ApprovalCenter = lazy(() => import('./pages/ApprovalCenter').then(m => ({ default: m.ApprovalCenter })));
const BrandKnowledgeHub = lazy(() => import('./pages/BrandKnowledgeHub').then(m => ({ default: m.BrandKnowledgeHub })));
const IntelligenceReports = lazy(() => import('./pages/IntelligenceReports').then(m => ({ default: m.IntelligenceReports })));
const Integrations = lazy(() => import('./pages/Integrations').then(m => ({ default: m.Integrations })));
const CompanyGuidelines = lazy(() => import('./pages/CompanyGuidelines').then(m => ({ default: m.CompanyGuidelines })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));

// Warm cream editorial loading fallback (Matches BrandGuard AI design tokens)
const RouteLoadingFallback = () => (
  <div className="min-h-screen bg-[#F7F4EC] flex flex-col items-center justify-center space-y-4 select-none">
    <div className="w-11 h-11 rounded-2xl bg-[#244B3F] text-[#FCFAF5] flex items-center justify-center shadow-[0_8px_20px_rgba(36,75,63,0.18)] animate-pulse">
      <span className="font-heading text-xl font-bold tracking-tight">B</span>
    </div>
    <div className="flex items-center space-x-2 text-xs font-mono text-[#68736B]">
      <span className="inline-block w-2 h-2 rounded-full bg-[#C6A66B] animate-ping" />
      <span>Loading BrandGuard AI module...</span>
    </div>
  </div>
);

// Protected Route Guard for Application Modules
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <RouteLoadingFallback />;
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
    return <RouteLoadingFallback />;
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
    return <RouteLoadingFallback />;
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
        <Suspense fallback={<RouteLoadingFallback />}>
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
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
