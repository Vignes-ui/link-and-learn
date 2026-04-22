import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, Info } from 'lucide-react';
import { resetPassword } from '../../api/auth';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = useMemo(() => params.get('token') || '', [params]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!token) {
      setError('Reset token is missing.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await resetPassword(token, password);
      setNotice(res?.message || 'Password updated.');
      setTimeout(() => navigate('/', { replace: true }), 1200);
    } catch (err) {
      setError(err.message || 'Unable to reset password');
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
          <h1 className="text-2xl font-display font-bold">Create new password</h1>
          <p className="mt-2 text-sm text-slate-500">Choose a password with at least 6 characters.</p>
        </div>

        {notice && (
          <div className="mb-5 flex items-start rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <Info className="mr-2 h-5 w-5 flex-shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        {error && (
          <div className="mb-5 flex items-start rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="mr-2 h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="ml-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="w-full rounded-xl border border-slate-200 bg-white p-3.5 pr-12 text-slate-900 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
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

          <div className="space-y-1.5">
            <label className="ml-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Confirm Password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              className="w-full rounded-xl border border-slate-200 bg-white p-3.5 text-slate-900 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !token}
            className="w-full rounded-xl bg-primary-600 py-4 font-semibold text-white shadow-md transition hover:bg-primary-700 disabled:opacity-70"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>

        <Link to="/" className="mt-6 block text-center text-sm font-semibold text-primary-600 hover:text-primary-700">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
