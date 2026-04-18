import { useState, useEffect } from 'react';
import { login, signup, loginWithGoogle } from '../../api/auth';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ROLES = [
  { value: 'student', label: '🎓 Student', type: 'personal' },
  { value: 'researcher', label: '🔬 Researcher / Faculty', type: 'personal' },
  { value: 'institution', label: '🏫 School / College / University', type: 'institutional' },
  { value: 'govt_body', label: '🏛 Government Research Body', type: 'institutional' },
  { value: 'ngo', label: '🤝 NGO / Funding Agency', type: 'institutional' },
  { value: 'vendor', label: '🏭 Vendor / Supplier', type: 'institutional' },
];

export default function AuthPage() {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) navigate('/dashboard');
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
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedRole = ROLES.find(r => r.value === role);
  const isInstitutional = selectedRole?.type === 'institutional';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-xl mb-3">
            <span className="text-white text-2xl font-bold">L</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Link & Learn</h1>
          <p className="text-gray-500 text-sm mt-1">Professional Networking for Education</p>
        </div>

        {/* Tab toggle */}
        <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
          <button
            type="button"
            onClick={() => { setIsSignup(false); setError(''); }}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${!isSignup ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsSignup(true); setError(''); }}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${isSignup ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignup && (
            <input
              type="text"
              placeholder={isInstitutional ? "Organisation / Institution Name" : "Full Name"}
              className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          )}

          <input
            type="email"
            placeholder="Email address"
            className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />

          {isSignup && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
              <select
                className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={role}
                onChange={e => setRole(e.target.value)}
              >
                <optgroup label="Personal Accounts">
                  {ROLES.filter(r => r.type === 'personal').map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </optgroup>
                <optgroup label="Institutional Accounts">
                  {ROLES.filter(r => r.type === 'institutional').map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </optgroup>
              </select>
              {isInstitutional && (
                <p className="text-amber-600 text-xs mt-2 bg-amber-50 p-2 rounded-lg">
                  ⚠️ Institutional accounts require Platform Admin approval before activation.
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Please wait...' : isSignup ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-3 text-gray-400">or continue with</span>
          </div>
        </div>

        <button
          type="button"
          onClick={async () => {
            try {
              setLoading(true);
              await loginWithGoogle();
              navigate('/dashboard');
            } catch (err) {
              setError(err.message);
            } finally {
              setLoading(false);
            }
          }}
          className="w-full border border-gray-300 py-3 rounded-lg flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors font-medium text-gray-700"
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="google" className="w-5 h-5" />
          Continue with Google
        </button>
      </div>
    </div>
  );
}
