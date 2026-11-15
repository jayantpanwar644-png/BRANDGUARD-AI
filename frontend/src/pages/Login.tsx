import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, ArrowRight, Lock, Mail, Building, User, LogOut, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Aurora } from '../components/ui/aurora';

interface LoginProps {
  defaultRegister?: boolean;
}

export const Login: React.FC<LoginProps> = ({ defaultRegister = false }) => {
  const [isRegister, setIsRegister] = useState(defaultRegister);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('Technology / SaaS');
  const [website, setWebsite] = useState('');
  const [fullName, setFullName] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register, isAuthenticated, user, organisation, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setIsRegister(defaultRegister);
  }, [defaultRegister]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        if (!companyName.trim()) throw new Error('Company name is required');
        await register({
          company_name: companyName,
          official_email: email,
          password: password,
          industry: industry,
          website: website || undefined,
          full_name: fullName || undefined
        });
        navigate('/app/dashboard');
      } else {
        await login(email, password);
        navigate('/app/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F7F9FC] relative overflow-hidden select-none">
      {/* Subtle Light Theme Atmospheric Aurora */}
      <Aurora
        asBackgroundOnly
        className="fixed inset-0 pointer-events-none z-0"
        colors={['#183B59', '#315C76', '#263A52']}
        duration={28}
        intensity={0.07}
      />

      <div className="w-full max-w-md mx-auto z-10 relative">
        {/* Brand identity header */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#315C76] text-white shadow-sm shadow-[#315C76]/20 mb-3 hover:scale-102 transition-transform">
            <ShieldCheck className="w-7 h-7 stroke-[2]" />
          </Link>
          <h1 className="text-2xl font-bold font-heading text-[#172033] tracking-tight">BrandGuard AI</h1>
          <p className="text-[13px] text-[#64748B] mt-1 max-w-xs mx-auto leading-relaxed">
            Protecting Brand Identity Before Publication and Public Trust After Publication.
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-6 sm:p-8 shadow-sm">
          {/* Already Signed In Indicator */}
          {isAuthenticated && (
            <div className="mb-6 p-4 rounded-xl bg-[#F0FDF4] border border-emerald-200 text-xs text-[#172033] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-semibold text-emerald-900">Already Signed In</span>
                </div>
                <span className="text-[11px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md font-medium">Active Session</span>
              </div>
              
              <div className="text-[12.5px] text-[#334155] leading-relaxed">
                You are currently signed in as <strong className="text-[#0F172A]">{user?.full_name || user?.email}</strong> ({user?.role || 'Brand Manager'}) at <strong className="text-[#0F172A]">{organisation?.name || 'Your Company'}</strong>.
              </div>

              <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/app/dashboard')}
                  className="flex-1 py-2.5 px-3 bg-[#315C76] hover:bg-[#183B59] text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <span>Continue to Command Center</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setEmail('');
                    setPassword('');
                  }}
                  className="py-2.5 px-3 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1 transition-colors cursor-pointer"
                  title="Sign out of current account and log in as someone else"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Switch Account</span>
                </button>
              </div>

              <div className="pt-1 text-center border-t border-emerald-200/60 text-[11px] text-[#64748B]">
                Or enter new credentials below to switch accounts immediately
              </div>
            </div>
          )}

          {/* Tab Selector */}
          <div className="grid grid-cols-2 p-1 bg-[#F1F5F9] rounded-xl mb-5 border border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => { setIsRegister(false); setError(''); }}
              className={`py-2 text-[13px] font-semibold rounded-lg transition-all ${
                !isRegister ? 'bg-[#FFFFFF] text-[#172033] shadow-xs' : 'text-[#64748B] hover:text-[#172033]'
              }`}
            >
              Company Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsRegister(true); setError(''); }}
              className={`py-2 text-[13px] font-semibold rounded-lg transition-all ${
                isRegister ? 'bg-[#FFFFFF] text-[#172033] shadow-xs' : 'text-[#64748B] hover:text-[#172033]'
              }`}
            >
              Register Company
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[13px]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {isRegister && (
              <>
                <div>
                  <label className="block text-[13px] font-semibold text-[#475569] mb-1">Company Name *</label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Acme Corporation"
                      className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg pl-9 pr-3 py-2 text-[13px] text-[#172033] placeholder-[#94A3B8] focus:outline-none focus:border-[#315C76] transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-[#475569] mb-1">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Brand Director / Manager"
                      className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg pl-9 pr-3 py-2 text-[13px] text-[#172033] placeholder-[#94A3B8] focus:outline-none focus:border-[#315C76] transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[13px] font-semibold text-[#475569] mb-1">Industry</label>
                    <input
                      type="text"
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      placeholder="Technology, FMCG"
                      className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg px-3 py-2 text-[13px] text-[#172033] placeholder-[#94A3B8] focus:outline-none focus:border-[#315C76] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-[#475569] mb-1">Website (Optional)</label>
                    <input
                      type="text"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://acme.com"
                      className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg px-3 py-2 text-[13px] text-[#172033] placeholder-[#94A3B8] focus:outline-none focus:border-[#315C76] transition-colors"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-[13px] font-semibold text-[#475569] mb-1">Official Company Email *</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@nexusdynamics.io"
                  className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg pl-9 pr-3 py-2 text-[13px] text-[#172033] placeholder-[#94A3B8] focus:outline-none focus:border-[#315C76] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-[#475569] mb-1">Password *</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg pl-9 pr-3 py-2 text-[13px] text-[#172033] placeholder-[#94A3B8] focus:outline-none focus:border-[#315C76] transition-colors"
                />
              </div>
            </div>

            {!isRegister && (
              <div className="flex items-center justify-between text-[13px] pt-1">
                <label className="flex items-center text-[#64748B] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded bg-[#FFFFFF] border-[#CBD5E1] text-[#315C76] mr-2 focus:ring-0"
                  />
                  Remember session
                </label>
                <button
                  type="button"
                  onClick={() => alert("Password reset link dispatched to your registered email.")}
                  className="text-[#315C76] hover:text-[#183B59] transition-colors font-semibold"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center space-x-2 py-2.5 px-4 bg-[#315C76] hover:bg-[#183B59] disabled:opacity-50 text-white text-[14px] font-semibold rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <span>{loading ? 'Authenticating...' : isRegister ? 'Complete Registration & Setup' : 'Secure Enterprise Sign In'}</span>
              <ArrowRight className="w-4 h-4 stroke-[2]" />
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-5 pt-3 border-t border-[#F1F5F9] text-center">
            <span className="text-[12px] text-[#64748B]">
              Demo credentials: <code className="text-[#172033] font-mono bg-[#F1F5F9] px-1.5 py-0.5 rounded text-[11px]">admin@nexusdynamics.io</code> / <code className="text-[#172033] font-mono bg-[#F1F5F9] px-1.5 py-0.5 rounded text-[11px]">SecurePassword2026!</code>
            </span>
          </div>
        </div>

        <div className="text-center mt-4">
          <Link to="/" className="text-[13px] font-medium text-[#64748B] hover:text-[#172033] transition-colors">
            ← Return to BrandGuard AI Public Homepage
          </Link>
        </div>
      </div>
    </div>
  );
};
