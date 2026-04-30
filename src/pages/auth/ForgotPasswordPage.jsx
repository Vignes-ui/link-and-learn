import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Info } from 'lucide-react';
import { forgotPassword } from '../../api/auth';

const LOGO_SRC = '/logo-big.png';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [resetUrl, setResetUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setResetUrl('');
    setLoading(true);
    try {
      const res = await forgotPassword(email);
      setNotice(res?.message || 'Password reset link prepared.');
      if (res?.resetUrl) setResetUrl(res.resetUrl);
    } catch (err) {
      setError(err.message || 'Unable to prepare reset link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6] px-4 text-slate-900">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-8 text-center">
          <img src={LOGO_SRC} alt="Link & Learn" className="mx-auto mb-5 h-14 w-14 rounded-2xl object-contain shadow-lg" />
          <h1 className="text-2xl font-display font-bold">Reset password</h1>
          <p className="mt-2 text-sm text-slate-500">Enter your account email to get a reset link.</p>
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
              Email Address
            </label>
            <input
              type="email"
              className="w-full rounded-xl border border-slate-200 bg-white p-3.5 text-slate-900 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary-600 py-4 font-semibold text-white shadow-md transition hover:bg-primary-700 disabled:opacity-70"
          >
            {loading ? 'Preparing...' : 'Send Reset Link'}
          </button>
        </form>

        {resetUrl && (
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <p className="mb-2 font-semibold text-slate-700">Local reset link</p>
            <Link className="break-all text-primary-700 hover:text-primary-800" to={new URL(resetUrl).pathname + new URL(resetUrl).search}>
              {resetUrl}
            </Link>
          </div>
        )}

        <Link to="/" className="mt-6 block text-center text-sm font-semibold text-primary-600 hover:text-primary-700">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
