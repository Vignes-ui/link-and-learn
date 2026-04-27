import { useState, useEffect, useMemo } from 'react';
import { login, signup } from '../../api/auth';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getHomePathForRole } from '../../constants/navigation';
import { ROLES } from '../../constants/roles';

import { AlertCircle, CircleUserRound, Eye, EyeOff, Globe, Info, PanelsTopLeft } from 'lucide-react';

export default function AuthPage() {
  const location = useLocation();
  const oauthMessage = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const oauthError = params.get('oauth_error') || '';
    const oauthNotice = params.get('notice') === 'approval-pending'
      ? 'Institutional account created. Await admin approval before signing in.'
      : '';
    return { error: oauthError, notice: oauthNotice };
  }, [location.search]);

  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState(oauthMessage.error);
  const [notice, setNotice] = useState(oauthMessage.notice);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { currentUser, refreshUser, userData } = useAuth();
  const navigate = useNavigate();
  const defaultRoute = getHomePathForRole(userData?.role);

  useEffect(() => {
    if (currentUser) navigate(userData?.roleSelected === false ? '/oauth-role' : defaultRoute);
  }, [currentUser, defaultRoute, navigate, userData?.roleSelected]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);
    try {
      if (isSignup) {
        const res = await signup(email, password, role, name);
        if (res?.signup && !res.signup.loginAllowed) {
          setNotice('Institutional account created. Await admin approval before signing in.');
          setIsSignup(false);
          setPassword('');
          await refreshUser();
          return;
        }
      } else {
        await login(email, password);
      }
      await refreshUser();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = (provider) => {
    setError('');
    const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
    setNotice(`${providerName} OAuth button is added. Add the OAuth credentials later to enable real sign in.`);
  };

  const selectedRole = ROLES.find(r => r.value === role);
  const isInstitutional = selectedRole?.type === 'institutional';

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#FAF9F6] text-slate-900 selection:bg-primary-200 selection:text-primary-900">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-slate-200 rounded-full blur-[120px] opacity-60 animate-pulse mix-blend-multiply" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-slate-200 rounded-full blur-[120px] opacity-60 animate-pulse mix-blend-multiply delay-1000" />
      
      <div className="relative z-10 w-full max-w-md p-8 sm:p-10 mx-4 glass-panel rounded-[2rem] shadow-2xl animate-fade-in backdrop-blur-2xl border border-slate-200">
        
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl mb-6 shadow-[0_0_30px_rgba(10,102,194,0.3)] transform hover:scale-105 transition-transform duration-300">
            <span className="text-white text-3xl font-display font-bold tracking-tighter">L</span>
          </div>
          <h1 className="text-3xl font-display font-bold text-slate-900 mb-2 tracking-tight">Link & Learn</h1>
          <p className="text-slate-500 text-sm font-medium">Empowering the Education Ecosystem</p>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-slate-100 backdrop-blur-md p-1 rounded-xl mb-8 border border-slate-200">
          <button
            type="button"
            onClick={() => { setIsSignup(false); setError(''); setNotice(''); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${!isSignup ? 'bg-white text-primary-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'}`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsSignup(true); setError(''); setNotice(''); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${isSignup ? 'bg-white text-primary-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'}`}
          >
            Create Account
          </button>
        </div>

        {notice && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 text-sm mb-6 flex items-start animate-slide-up">
            <Info className="w-5 h-5 mr-2 text-emerald-600 flex-shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-200 rounded-xl p-4 text-sm mb-6 flex items-start animate-slide-up">
            <AlertCircle className="w-5 h-5 mr-2 text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 animate-slide-up">
          {isSignup && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">{isInstitutional ? "Organisation Name" : "Full Name"}</label>
              <input
                type="text"
                className="w-full bg-white border border-slate-200 text-slate-900 placeholder-slate-400 p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-300 shadow-sm"
                placeholder={isInstitutional ? "e.g., Global Institute of Tech" : "e.g., Jane Doe"}
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Email Address</label>
            <input
              type="email"
              className="w-full bg-white border border-slate-200 text-slate-900 placeholder-slate-400 p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-300 shadow-sm"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Password</label>
              {!isSignup && (
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="text-xs font-semibold text-primary-600 hover:text-primary-700"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="w-full bg-white border border-slate-200 text-slate-900 placeholder-slate-400 p-3.5 pr-12 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-300 shadow-sm"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-400 hover:text-slate-700"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {isSignup && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Account Type</label>
              <div className="relative">
                <select
                  className="w-full appearance-none bg-white border border-slate-200 text-slate-900 p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-300 cursor-pointer shadow-sm"
                  value={role}
                  onChange={e => setRole(e.target.value)}
                >
                  <optgroup label="Personal Accounts" className="bg-white text-slate-700">
                    {ROLES.filter(r => r.type === 'personal').map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Institutional Accounts" className="bg-white text-slate-700">
                    {ROLES.filter(r => r.type === 'institutional').map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </optgroup>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                  ▼
                </div>
              </div>
              {isInstitutional && (
                <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start animate-fade-in">
                  <Info className="w-4 h-4 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
                  <p className="text-amber-800 text-xs leading-relaxed">
                    Institutional accounts require <span className="font-semibold text-amber-900">Platform Admin approval</span> before activation.
                  </p>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full relative group overflow-hidden bg-primary-600 text-white py-4 rounded-xl font-semibold hover:bg-primary-700 disabled:opacity-70 transition-all duration-300 shadow-md hover:shadow-lg mt-6"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
            <span className="relative flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Processing...
                </>
              ) : isSignup ? 'Create Account' : 'Sign In Securely'}
            </span>
          </button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs font-semibold uppercase text-slate-400">or continue with</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="grid gap-3">
          <button
            type="button"
            onClick={() => handleOAuth('google')}
            className="flex h-12 items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 shadow-sm transition hover:border-primary-200 hover:bg-primary-50"
            title="Continue with Google"
            aria-label="Continue with Google"
          >
            <Globe className="h-5 w-5" />
            Google
          </button>
          <button
            type="button"
            onClick={() => handleOAuth('microsoft')}
            className="flex h-12 items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 shadow-sm transition hover:border-primary-200 hover:bg-primary-50"
            title="Continue with Microsoft"
            aria-label="Continue with Microsoft"
          >
            <PanelsTopLeft className="h-5 w-5" />
            Microsoft
          </button>
          <button
            type="button"
            onClick={() => handleOAuth('facebook')}
            className="flex h-12 items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 shadow-sm transition hover:border-primary-200 hover:bg-primary-50"
            title="Continue with Facebook"
            aria-label="Continue with Facebook"
          >
            <CircleUserRound className="h-5 w-5" />
            Facebook
          </button>
        </div>
      </div>
    </div>
  );
}
