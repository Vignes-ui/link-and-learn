import { useState, useEffect } from 'react';
import { login, signup } from '../../api/auth';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

import { AlertCircle, Info } from 'lucide-react';

const ROLES = [
  { value: 'student', label: 'Student', type: 'personal' },
  { value: 'researcher', label: 'Researcher / Faculty', type: 'personal' },
  { value: 'institution', label: 'School / College / University', type: 'institutional' },
  { value: 'govt_body', label: 'Government Research Body', type: 'institutional' },
  { value: 'ngo', label: 'NGO / Funding Agency', type: 'institutional' },
  { value: 'vendor', label: 'Vendor / Supplier', type: 'institutional' },
  { value: 'advertiser', label: 'Advertiser / Sponsor', type: 'institutional' },
];

export default function AuthPage() {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { currentUser, refreshUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) navigate('/feed');
  }, [currentUser, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSignup) {
        await signup(email, password, role, name);
      } else {
        await login(email, password);
      }
      await refreshUser();
      navigate('/feed');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
            onClick={() => { setIsSignup(false); setError(''); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${!isSignup ? 'bg-white text-primary-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'}`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsSignup(true); setError(''); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${isSignup ? 'bg-white text-primary-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'}`}
          >
            Create Account
          </button>
        </div>

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
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Password</label>
            <input
              type="password"
              className="w-full bg-white border border-slate-200 text-slate-900 placeholder-slate-400 p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-300 shadow-sm"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
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
      </div>
    </div>
  );
}
