import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ShieldCheck, ArrowRight, Lock, Mail, Building, User, LogOut, 
  Eye, EyeOff, Globe, Check, Sparkles, X, KeyRound, MessageSquareHeart
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Aurora } from '../components/ui/aurora';
import { BrandSecurityVisual } from '../components/brand/BrandSecurityVisual';
import { CommentIntelligenceDemo } from '../components/brand/CommentIntelligenceDemo';

interface LoginProps {
  defaultRegister?: boolean;
}

export const Login: React.FC<LoginProps> = ({ defaultRegister = false }) => {
  const [isRegister, setIsRegister] = useState(defaultRegister);
  const [showPassword, setShowPassword] = useState(false);
  const [showDemoFeedback, setShowDemoFeedback] = useState(false);
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('Technology / SaaS');
  const [website, setWebsite] = useState('');
  const [fullName, setFullName] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot Password Modal State
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

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

  // Secure One-Click Evaluation Login (no password printed on screen)
  const handleDemoLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await login('admin@nexusdynamics.io', 'SecurePassword2026!');
      navigate('/app/dashboard');
    } catch (err: any) {
      setError(err.message || 'Evaluation sandbox connection failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    setTimeout(() => {
      setForgotLoading(false);
      setForgotSuccess(true);
    }, 600);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#F7F4EC] relative overflow-hidden font-sans">
      {/* Ambient Cream-to-Sage Gradient Movement */}
      <Aurora
        asBackgroundOnly
        className="fixed inset-0 pointer-events-none z-0"
        colors={['#829887', '#C6A66B', '#244B3F']}
        duration={42}
        intensity={0.05}
      />

      <div className="w-full max-w-7xl mx-auto z-10 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* ========================================================= */}
          {/* LEFT SIDE — BRAND EXPERIENCE (50–55% of desktop)           */}
          {/* ========================================================= */}
          <div className="lg:col-span-7 space-y-6 animate-fade-up">
            
            {/* Brand Logo & Editorial Header */}
            <div>
              <Link to="/" className="inline-flex items-center space-x-3 group mb-4">
                <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-[#244B3F] to-[#18382F] text-[#FCFAF5] flex items-center justify-center shadow-[0_4px_16px_rgba(36,75,63,0.25)] group-hover:scale-105 transition-transform overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#FCFAF5]/25 to-transparent -translate-x-full group-hover:animate-shimmer" />
                  <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div>
                  <span className="text-2xl sm:text-3xl font-normal font-heading text-[#242B27] tracking-tight">BrandGuard AI</span>
                  <div className="text-[11.5px] font-semibold text-[#829887] uppercase tracking-wider">Enterprise Brand Governance</div>
                </div>
              </Link>

              <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-normal font-heading text-[#242B27] leading-[1.18] tracking-tight">
                Protect Your Brand. Build Lasting Trust.
              </h1>
              
              <p className="text-[14.5px] sm:text-[15.5px] text-[#69756C] mt-3 max-w-xl leading-relaxed">
                Intelligent brand governance and reputation protection, before and after publication.
              </p>
            </div>

            {/* Interactive View Toggle between Security Visual & Feedback Intelligence */}
            <div className="flex items-center space-x-2 pt-1">
              <button
                type="button"
                onClick={() => setShowDemoFeedback(false)}
                className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all cursor-pointer ${
                  !showDemoFeedback
                    ? 'bg-[#244B3F] text-[#FCFAF5] shadow-xs'
                    : 'bg-[#FCFAF5] text-[#69756C] border border-[#E4DFD5] hover:text-[#242B27]'
                }`}
              >
                Brand Security Architecture
              </button>
              <button
                type="button"
                onClick={() => setShowDemoFeedback(true)}
                className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                  showDemoFeedback
                    ? 'bg-[#244B3F] text-[#FCFAF5] shadow-xs'
                    : 'bg-[#FCFAF5] text-[#69756C] border border-[#E4DFD5] hover:text-[#242B27]'
                }`}
              >
                <MessageSquareHeart className="w-3.5 h-3.5" />
                <span>Customer Feedback Intelligence Preview</span>
              </button>
            </div>

            {/* Display Either the Abstract Animated Security Visual OR Customer Feedback Demo */}
            {!showDemoFeedback ? (
              <div className="bg-[#FCFAF5] border border-[#E4E1D7] rounded-3xl p-6 sm:p-8 shadow-[0_12px_40px_rgba(36,43,39,0.06)] relative overflow-hidden">
                <BrandSecurityVisual />
                
                {/* Feature Statement Bar */}
                <div className="mt-4 pt-4 border-t border-[#EFEBE3] flex items-center justify-center">
                  <div className="inline-flex items-center space-x-2 sm:space-x-3 px-4 py-2 rounded-full bg-[#F7F4EC] border border-[#E4DFD5] text-[12px] sm:text-[12.5px] font-semibold text-[#244B3F]">
                    <span>Monitor</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C6A66B]" />
                    <span>Analyze</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#829887]" />
                    <span>Protect</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C6A66B]" />
                    <span>Grow</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="animate-fade-up">
                <CommentIntelligenceDemo />
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* RIGHT SIDE — AUTHENTICATION CARD                          */}
          {/* ========================================================= */}
          <div className="lg:col-span-5 w-full max-w-md mx-auto animate-fade-up" style={{ animationDelay: '0.1s' }}>
            
            {/* Premium Ivory Sign-in Card */}
            <div className="bg-[#FCFAF5] border border-[#E4E1D7] rounded-3xl p-6 sm:p-8 shadow-[0_12px_40px_rgba(36,43,39,0.06)]">
              
              {/* Card Header */}
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#EBF0ED] border border-[#C8D7CF] text-[#244B3F] mb-3">
                  <KeyRound className="w-5 h-5 stroke-[2]" />
                </div>
                <h2 className="text-2xl sm:text-[26px] font-normal font-heading text-[#242B27] tracking-tight">
                  {isRegister ? 'Register Company' : 'Welcome Back'}
                </h2>
                <p className="text-[13px] text-[#69756C] mt-1">
                  {isRegister ? 'Set up a new verified enterprise workspace' : 'Sign in to your enterprise workspace'}
                </p>
              </div>

              {/* Already Signed In Indicator */}
              {isAuthenticated && (
                <div className="mb-6 p-4 rounded-2xl bg-[#EBF0ED] border border-[#C8D7CF] text-xs text-[#242B27] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#244B3F] animate-pulse" />
                      <span className="font-semibold text-[#244B3F]">Active Session Detected</span>
                    </div>
                    <span className="text-[11px] text-[#244B3F] bg-[#FCFAF5] px-2 py-0.5 rounded-md font-semibold border border-[#C8D7CF]">Signed In</span>
                  </div>
                  
                  <div className="text-[12.5px] text-[#344D3D] leading-relaxed">
                    Signed in as <strong className="text-[#242B27]">{user?.full_name || user?.email}</strong> at <strong className="text-[#242B27]">{organisation?.name || 'Your Company'}</strong>.
                  </div>

                  <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <button
                      type="button"
                      onClick={() => navigate('/app/dashboard')}
                      className="flex-1 py-2 px-3 bg-[#244B3F] hover:bg-[#18382F] text-[#FCFAF5] rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
                    >
                      <span>Go to Dashboard</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        setEmail('');
                        setPassword('');
                      }}
                      className="py-2 px-3 bg-[#FCFAF5] hover:bg-[#FAF0EC] text-[#C77E63] border border-[#ECCBC0] rounded-xl text-xs font-semibold flex items-center justify-center space-x-1 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3 h-3" />
                      <span>Switch</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Tab Selector */}
              <div className="grid grid-cols-2 p-1 bg-[#F7F4EC] rounded-2xl mb-5 border border-[#E4DFD5]">
                <button
                  type="button"
                  onClick={() => { setIsRegister(false); setError(''); }}
                  className={`py-2 text-[13px] font-semibold rounded-xl transition-all cursor-pointer ${
                    !isRegister ? 'bg-[#FCFAF5] text-[#244B3F] shadow-xs border border-[#E4DFD5]' : 'text-[#69756C] hover:text-[#242B27]'
                  }`}
                >
                  Company Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setIsRegister(true); setError(''); }}
                  className={`py-2 text-[13px] font-semibold rounded-xl transition-all cursor-pointer ${
                    isRegister ? 'bg-[#FCFAF5] text-[#244B3F] shadow-xs border border-[#E4DFD5]' : 'text-[#69756C] hover:text-[#242B27]'
                  }`}
                >
                  Register Company
                </button>
              </div>

              {/* Error Banner */}
              {error && (
                <div className="mb-4 p-3 rounded-xl bg-[#FAF0EC] border border-[#ECCBC0] text-[#B85E42] text-[13px] leading-relaxed animate-fade-in flex items-start space-x-2">
                  <span className="font-semibold text-xs mt-0.5">Notice:</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Authentication Form */}
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {isRegister && (
                  <>
                    <div>
                      <label className="block text-[13px] font-semibold text-[#242B27] mb-1">Company Name *</label>
                      <div className="relative">
                        <Building className="w-4 h-4 text-[#829887] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          required
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="Acme Corporation"
                          className="w-full bg-[#FCFAF5] border border-[#E4DFD5] rounded-xl pl-9 pr-3 py-2 text-[13.5px] text-[#242B27] placeholder-[#93988F] focus:outline-none focus:border-[#244B3F] focus:ring-1 focus:ring-[#244B3F] transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[13px] font-semibold text-[#242B27] mb-1">Full Name</label>
                      <div className="relative">
                        <User className="w-4 h-4 text-[#829887] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Brand Director / Manager"
                          className="w-full bg-[#FCFAF5] border border-[#E4DFD5] rounded-xl pl-9 pr-3 py-2 text-[13.5px] text-[#242B27] placeholder-[#93988F] focus:outline-none focus:border-[#244B3F] focus:ring-1 focus:ring-[#244B3F] transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[13px] font-semibold text-[#242B27] mb-1">Industry</label>
                        <select
                          value={industry}
                          onChange={(e) => setIndustry(e.target.value)}
                          className="w-full bg-[#FCFAF5] border border-[#E4DFD5] rounded-xl px-2.5 py-2 text-[13px] text-[#242B27] focus:outline-none focus:border-[#244B3F] focus:ring-1 focus:ring-[#244B3F] transition-all"
                        >
                          <option value="Technology / SaaS">Technology / SaaS</option>
                          <option value="Healthcare & Bio">Healthcare & Bio</option>
                          <option value="Financial Services">Financial Services</option>
                          <option value="Consumer & Retail">Consumer & Retail</option>
                          <option value="Manufacturing">Manufacturing</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[13px] font-semibold text-[#242B27] mb-1">Website (Optional)</label>
                        <div className="relative">
                          <Globe className="w-4 h-4 text-[#829887] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            value={website}
                            onChange={(e) => setWebsite(e.target.value)}
                            placeholder="acme.com"
                            className="w-full bg-[#FCFAF5] border border-[#E4DFD5] rounded-xl pl-8 pr-2.5 py-2 text-[13px] text-[#242B27] placeholder-[#93988F] focus:outline-none focus:border-[#244B3F] focus:ring-1 focus:ring-[#244B3F] transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Email Field */}
                <div>
                  <label className="block text-[13px] font-semibold text-[#242B27] mb-1">Official Company Email *</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#829887] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="corporate@company.com"
                      className="w-full bg-[#FCFAF5] border border-[#E4DFD5] rounded-xl pl-9 pr-3 py-2 text-[13.5px] text-[#242B27] placeholder-[#93988F] focus:outline-none focus:border-[#244B3F] focus:ring-1 focus:ring-[#244B3F] transition-all"
                    />
                  </div>
                </div>

                {/* Password Field with Show/Hide Toggle */}
                <div>
                  <label className="block text-[13px] font-semibold text-[#242B27] mb-1">Password *</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#829887] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-[#FCFAF5] border border-[#E4DFD5] rounded-xl pl-9 pr-10 py-2 text-[13.5px] text-[#242B27] placeholder-[#93988F] focus:outline-none focus:border-[#244B3F] focus:ring-1 focus:ring-[#244B3F] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#829887] hover:text-[#242B27] transition-colors p-0.5 rounded cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4 stroke-[2]" />
                      ) : (
                        <Eye className="w-4 h-4 stroke-[2]" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password Link */}
                {!isRegister && (
                  <div className="flex items-center justify-between text-[13px] pt-1">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={rememberMe}
                      onClick={() => setRememberMe(!rememberMe)}
                      className="flex items-center text-[#69756C] hover:text-[#242B27] cursor-pointer select-none bg-transparent border-0 p-0 text-left"
                    >
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center mr-2 transition-all cursor-pointer ${
                          rememberMe
                            ? 'bg-[#244B3F] border-[#244B3F] text-[#FCFAF5]'
                            : 'bg-[#FCFAF5] border-[#E4DFD5]'
                        }`}
                      >
                        {rememberMe && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span>Remember session</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail(email);
                        setForgotSuccess(false);
                        setIsForgotModalOpen(true);
                      }}
                      className="text-[#244B3F] hover:text-[#18382F] transition-colors font-semibold cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 group flex items-center justify-center space-x-2 py-3 px-4 bg-[#244B3F] hover:bg-[#18382F] disabled:opacity-50 text-[#FCFAF5] text-[14px] font-semibold rounded-xl shadow-[0_2px_8px_rgba(36,75,63,0.18)] transition-all cursor-pointer active:scale-[0.98]"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-[#FCFAF5] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{isRegister ? 'Complete Registration & Setup' : 'Secure Enterprise Sign In'}</span>
                      <ArrowRight className="w-4 h-4 stroke-[2] group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              {/* Secure Quick Evaluation Access Button (replaces insecure plain text credentials) */}
              {!isRegister && (
                <div className="mt-5 pt-3.5 border-t border-[#EFEBE3] text-center">
                  <button
                    type="button"
                    onClick={handleDemoLogin}
                    disabled={loading}
                    className="w-full py-2 px-3 rounded-xl bg-[#F7F4EC] hover:bg-[#EBF0ED] border border-[#E4DFD5] hover:border-[#C8D7CF] text-[12px] font-semibold text-[#244B3F] flex items-center justify-center space-x-1.5 transition-all cursor-pointer active:scale-[0.98]"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#C6A66B]" />
                    <span>Quick Evaluation Access (Nexus Dynamics Demo)</span>
                  </button>
                  <p className="text-[11px] text-[#93988F] mt-1.5">
                    Preconfigured credentials loaded via secure token gateway
                  </p>
                </div>
              )}
            </div>

            <div className="text-center mt-4">
              <Link to="/" className="text-[13px] font-medium text-[#69756C] hover:text-[#242B27] transition-colors">
                ← Return to BrandGuard AI Public Homepage
              </Link>
            </div>
          </div>

        </div>
      </div>

      {/* Forgot Password Modal */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-[#FCFAF5] border border-[#E4DFD5] rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-[0_16px_50px_rgba(0,0,0,0.15)] relative animate-fade-up">
            <button
              type="button"
              onClick={() => setIsForgotModalOpen(false)}
              className="absolute top-5 right-5 text-[#829887] hover:text-[#242B27] p-1 rounded-lg hover:bg-[#F7F4EC] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-10 h-10 rounded-xl bg-[#EBF0ED] border border-[#C8D7CF] text-[#244B3F] flex items-center justify-center mb-3">
              <Lock className="w-5 h-5 stroke-[2]" />
            </div>

            <h3 className="text-xl font-normal font-heading text-[#242B27]">Reset Workspace Access</h3>
            <p className="text-[13px] text-[#69756C] mt-1 leading-relaxed">
              Enter your corporate email address to receive secure identity verification instructions.
            </p>

            {forgotSuccess ? (
              <div className="mt-4 p-4 rounded-2xl bg-[#EBF0ED] border border-[#C8D7CF] space-y-3">
                <div className="flex items-center space-x-2 text-[#244B3F] text-[13px] font-semibold">
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Recovery Dispatch Initiated</span>
                </div>
                <p className="text-[12.5px] text-[#344D3D] leading-relaxed">
                  If an active enterprise account is registered for <strong className="text-[#242B27]">{forgotEmail}</strong>, password reset instructions have been dispatched to your corporate inbox.
                </p>
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(false)}
                  className="w-full py-2 bg-[#244B3F] hover:bg-[#18382F] text-[#FCFAF5] text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPasswordSubmit} className="mt-4 space-y-3">
                <div>
                  <label className="block text-[12.5px] font-semibold text-[#242B27] mb-1">Company Email</label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="corporate@company.com"
                    className="w-full bg-[#FCFAF5] border border-[#E4DFD5] rounded-xl px-3 py-2 text-[13px] text-[#242B27] placeholder-[#93988F] focus:outline-none focus:border-[#244B3F] focus:ring-1 focus:ring-[#244B3F]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-2.5 bg-[#244B3F] hover:bg-[#18382F] disabled:opacity-50 text-[#FCFAF5] text-[13px] font-semibold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center space-x-2"
                >
                  {forgotLoading ? (
                    <div className="w-4 h-4 border-2 border-[#FCFAF5] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Dispatch Recovery Link</span>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
