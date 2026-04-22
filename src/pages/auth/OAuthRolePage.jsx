import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Info } from 'lucide-react';
import { completeOAuthRole } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';
import { isInstitutionalRole, ROLES } from '../../constants/roles';

export default function OAuthRolePage() {
  const [role, setRole] = useState('student');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { currentUser, userData, refreshUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) navigate('/', { replace: true });
    if (currentUser && userData?.roleSelected !== false) navigate('/feed', { replace: true });
  }, [currentUser, navigate, userData]);

  const institutional = isInstitutionalRole(role);
  const displayName = name || userData?.name || '';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await completeOAuthRole(role, displayName);
      await refreshUser();
      if (res?.loginAllowed === false) {
        navigate('/?notice=approval-pending', { replace: true });
        return;
      }
      navigate('/setup-profile', { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to save role');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6] px-4 text-slate-900">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 text-2xl font-bold text-white shadow-lg">
            L
          </div>
          <h1 className="text-2xl font-display font-bold">Choose your role</h1>
          <p className="mt-2 text-sm text-slate-500">
            This completes your OAuth account setup.
          </p>
        </div>

        {error && (
          <div className="mb-5 flex items-start rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="mr-2 h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="ml-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Display Name
            </label>
            <input
              type="text"
              className="w-full rounded-xl border border-slate-200 bg-white p-3.5 text-slate-900 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={displayName}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name or organisation"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="ml-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Account Type
            </label>
            <select
              className="w-full rounded-xl border border-slate-200 bg-white p-3.5 text-slate-900 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={role}
              onChange={(event) => setRole(event.target.value)}
            >
              <optgroup label="Personal Accounts">
                {ROLES.filter((item) => item.type === 'personal').map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </optgroup>
              <optgroup label="Institutional Accounts">
                {ROLES.filter((item) => item.type === 'institutional').map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </optgroup>
            </select>
          </div>

          {institutional && (
            <div className="flex items-start rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
              <Info className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
              <span>Institutional accounts need platform admin approval before activation.</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary-600 py-4 font-semibold text-white shadow-md transition hover:bg-primary-700 disabled:opacity-70"
          >
            {loading ? 'Saving...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
