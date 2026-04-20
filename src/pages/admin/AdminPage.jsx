import { createElement, useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BadgeCheck,
  BookOpenCheck,
  Building2,
  Check,
  FileText,
  GraduationCap,
  Megaphone,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import {
  getAdminOverview,
  getAdminUsers,
  updateAdminCertificateStatus,
  updateAdminUserStatus,
} from '../../api/admin';
import { updateArticleStatus } from '../../api/articles';
import { getPendingAds, updateAdStatus } from '../../api/ads';
import { apiFetch } from '../../api/http';

const TABS = [
  { key: 'overview', label: 'Overview', icon: ShieldCheck },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'institutions', label: 'Institutions', icon: Building2 },
  { key: 'certificates', label: 'Certificates', icon: GraduationCap },
  { key: 'articles', label: 'Articles', icon: FileText },
  { key: 'ads', label: 'Ads', icon: Megaphone },
];

const USER_STATUSES = ['active', 'pending', 'suspended', 'rejected'];

const roleLabel = (role = '') => role.replaceAll('_', ' ') || 'unknown';

const formatDate = (value) => {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatPercent = (value) => {
  if (value === null || value === undefined || value === '') return 'N/A';
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return 'N/A';
  return `${Math.round(numeric * 100)}%`;
};

function StatusPill({ status }) {
  const styles = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    published: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    verified: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    suspended: 'bg-orange-50 text-orange-700 border-orange-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
    flagged: 'bg-red-50 text-red-700 border-red-200',
    paused: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold capitalize ${styles[status] || styles.paused}`}>
      {status || 'unknown'}
    </span>
  );
}

function EmptyState({ icon: Icon, title, text }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-12 text-center">
      {createElement(Icon, { className: 'mx-auto mb-3 h-10 w-10 text-slate-300' })}
      <p className="text-base font-bold text-slate-700">{title}</p>
      <p className="mt-1 text-sm font-medium text-slate-500">{text}</p>
    </div>
  );
}

function ActionButton({ children, tone = 'primary', ...props }) {
  const tones = {
    primary: 'bg-slate-900 text-white hover:bg-slate-800 border-slate-900',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600',
    danger: 'bg-white text-red-600 hover:bg-red-50 border-red-200',
    subtle: 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200',
  };

  return (
    <button
      {...props}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${tones[tone]} ${props.className || ''}`}
    >
      {children}
    </button>
  );
}

export default function AdminPage() {
  const [tab, setTab] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [pendingArticles, setPendingArticles] = useState([]);
  const [pendingAds, setPendingAds] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const pendingInstitutions = useMemo(
    () => users.filter((user) => user.loginType === 'institutional' && user.accountStatus === 'pending'),
    [users]
  );

  const pendingCertificates = useMemo(
    () => users
      .map((user) => ({
        ...user,
        pendingCertificates: (user.certificates || [])
          .map((cert, index) => ({ ...cert, index }))
          .filter((cert) => cert.status === 'pending'),
      }))
      .filter((user) => user.pendingCertificates.length > 0),
    [users]
  );

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return users;
    return users.filter((user) => (
      user.name?.toLowerCase().includes(normalized)
      || user.email?.toLowerCase().includes(normalized)
      || user.role?.toLowerCase().includes(normalized)
      || user.accountStatus?.toLowerCase().includes(normalized)
    ));
  }, [query, users]);

  const counts = {
    overview: overview?.totals?.users || users.length,
    users: users.length,
    institutions: pendingInstitutions.length,
    certificates: pendingCertificates.reduce((total, user) => total + user.pendingCertificates.length, 0),
    articles: pendingArticles.length,
    ads: pendingAds.length,
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [overviewData, adminUsers, articleData, ads] = await Promise.all([
        getAdminOverview(),
        getAdminUsers(),
        apiFetch('/api/articles?status=pending'),
        getPendingAds(),
      ]);
      setOverview(overviewData);
      setUsers(adminUsers);
      setPendingArticles(articleData.articles || []);
      setPendingAds(ads);
    } catch (err) {
      setError(err.message || 'Unable to load admin portal data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const flash = (text) => {
    setMessage(text);
    setTimeout(() => setMessage(''), 3200);
  };

  const runAction = async (fn, successMessage) => {
    setError('');
    try {
      await fn();
      flash(successMessage);
      await load();
    } catch (err) {
      setError(err.message || 'Action failed.');
    }
  };

  const metricCards = [
    { label: 'Total users', value: overview?.totals?.users || 0, icon: Users },
    { label: 'Pending institutions', value: overview?.totals?.pendingInstitutions || 0, icon: Building2 },
    { label: 'Pending articles', value: overview?.totals?.pendingArticles || 0, icon: FileText },
    { label: 'Pending ads', value: overview?.totals?.pendingAds || 0, icon: Megaphone },
    { label: 'Published articles', value: overview?.totals?.publishedArticles || 0, icon: BookOpenCheck },
    { label: 'Active campaigns', value: overview?.totals?.activeCampaigns || 0, icon: BadgeCheck },
    { label: 'Event registrations', value: overview?.totals?.eventRegistrations || 0, icon: Users },
    { label: 'Applications', value: overview?.totals?.applications || 0, icon: FileText },
    { label: 'Vendor quotes', value: overview?.totals?.vendorQuotes || 0, icon: Building2 },
    { label: 'Endorsements', value: overview?.totals?.endorsements || 0, icon: ShieldCheck },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <section className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-xl md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-200">
              <ShieldCheck className="h-4 w-4" />
              Admin Portal
            </div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Platform operations</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium text-slate-300 md:text-base">
              Manage users, institution approvals, certificate verification, article review, and campaign moderation.
            </p>
          </div>
          <ActionButton onClick={load} disabled={loading} className="border-white/20 bg-white/10 text-white hover:bg-white/20">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing' : 'Refresh'}
          </ActionButton>
        </div>
      </section>

      {(message || error) && (
        <div className={`flex items-start gap-3 rounded-2xl border p-4 text-sm font-bold shadow-sm ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {error ? <AlertCircle className="h-5 w-5 shrink-0" /> : <ShieldCheck className="h-5 w-5 shrink-0" />}
          <span>{error || message}</span>
        </div>
      )}

      <nav className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = tab === key;
          const needsAction = ['institutions', 'certificates', 'articles', 'ads'].includes(key) && counts[key] > 0;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-2xl border p-4 text-left transition-all ${active ? 'border-primary-300 bg-white shadow-md ring-2 ring-primary-500/20' : 'border-slate-200 bg-white/70 hover:border-slate-300 hover:bg-white'}`}
            >
              <div className="mb-3 flex items-center justify-between">
                {createElement(Icon, { className: `h-5 w-5 ${active ? 'text-primary-600' : 'text-slate-500'}` })}
                <span className={`text-lg font-bold ${needsAction ? 'text-red-600' : 'text-slate-900'}`}>{counts[key]}</span>
              </div>
              <p className={`text-sm font-bold ${active ? 'text-slate-950' : 'text-slate-600'}`}>{label}</p>
            </button>
          );
        })}
      </nav>

      {tab === 'overview' && (
        <section className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {metricCards.map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  {createElement(Icon, { className: 'h-6 w-6 text-slate-500' })}
                  <span className="text-3xl font-bold text-slate-950">{value}</span>
                </div>
                <p className="text-sm font-bold uppercase tracking-wider text-slate-500">{label}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-bold text-slate-950">Users by role</h2>
              <div className="space-y-3">
                {(overview?.usersByRole || []).map((item) => (
                  <div key={item.role} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                    <span className="text-sm font-bold capitalize text-slate-700">{roleLabel(item.role)}</span>
                    <span className="text-sm font-bold text-slate-950">{item.total}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-bold text-slate-950">Recent users</h2>
              <div className="space-y-3">
                {(overview?.recentUsers || []).map((user) => (
                  <div key={user.id} className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">{user.name || user.email}</p>
                      <p className="text-xs font-medium capitalize text-slate-500">{roleLabel(user.role)} joined {formatDate(user.createdAt)}</p>
                    </div>
                    <StatusPill status={user.accountStatus} />
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-bold text-slate-950">Ad performance</h2>
              <div className="space-y-3">
                {(overview?.adsByStatus || []).map((item) => (
                  <div key={item.status} className="grid grid-cols-4 items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm">
                    <span className="font-bold capitalize text-slate-700">{item.status}</span>
                    <span className="font-bold text-slate-950">{item.total} ads</span>
                    <span className="font-medium text-slate-600">{item.impressions} views</span>
                    <span className="font-medium text-slate-600">{item.ctr}% CTR</span>
                  </div>
                ))}
                {(overview?.adsByStatus || []).length === 0 && <p className="text-sm font-medium text-slate-500">No campaigns yet.</p>}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-bold text-slate-950">Daily signups</h2>
              <div className="space-y-2">
                {(overview?.dailyUsers || []).map((item) => (
                  <div key={item.day} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                    <span className="text-sm font-bold text-slate-700">{item.day}</span>
                    <span className="text-sm font-bold text-slate-950">{item.total}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {tab === 'users' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-950">User management</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">Search accounts and update access status.</p>
            </div>
            <label className="relative block w-full md:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search users"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-medium outline-none focus:border-primary-400 focus:bg-white focus:ring-2 focus:ring-primary-100"
              />
            </label>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="hidden grid-cols-[1.5fr_1fr_1fr_1fr] gap-4 bg-slate-50 px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 md:grid">
              <span>User</span>
              <span>Role</span>
              <span>Status</span>
              <span>Update</span>
            </div>
            <div className="divide-y divide-slate-200">
              {filteredUsers.map((user) => (
                <div key={user.id} className="grid gap-4 px-5 py-4 md:grid-cols-[1.5fr_1fr_1fr_1fr] md:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{user.name || 'Unnamed account'}</p>
                    <p className="truncate text-xs font-medium text-slate-500">{user.email}</p>
                  </div>
                  <p className="text-sm font-bold capitalize text-slate-700">{roleLabel(user.role)}</p>
                  <StatusPill status={user.accountStatus} />
                  <select
                    value={user.accountStatus}
                    onChange={(event) => runAction(
                      () => updateAdminUserStatus(user.id, event.target.value),
                      `${user.name || user.email} marked ${event.target.value}`
                    )}
                    className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold capitalize text-slate-700 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                  >
                    {USER_STATUSES.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              ))}
              {filteredUsers.length === 0 && (
                <div className="p-6">
                  <EmptyState icon={UserCog} title="No users found" text="Adjust the search query to view accounts." />
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {tab === 'institutions' && (
        <section className="space-y-4">
          {pendingInstitutions.length === 0 ? (
            <EmptyState icon={Building2} title="No pending institutions" text="Institutional account requests are clear." />
          ) : pendingInstitutions.map((institution) => (
            <div key={institution.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-950">{institution.name}</h2>
                    <StatusPill status={institution.accountStatus} />
                  </div>
                  <p className="text-sm font-medium text-slate-500">{institution.email}</p>
                  <p className="mt-3 text-sm font-bold capitalize text-slate-700">{roleLabel(institution.role)} account requested {formatDate(institution.createdAt)}</p>
                  {institution.bio && <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">{institution.bio}</p>}
                </div>
                <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
                  <ActionButton tone="success" onClick={() => runAction(() => updateAdminUserStatus(institution.id, 'active'), `${institution.name} approved`)}>
                    <Check className="h-4 w-4" />
                    Approve
                  </ActionButton>
                  <ActionButton tone="danger" onClick={() => runAction(() => updateAdminUserStatus(institution.id, 'rejected'), `${institution.name} rejected`)}>
                    <X className="h-4 w-4" />
                    Reject
                  </ActionButton>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      {tab === 'certificates' && (
        <section className="space-y-4">
          {pendingCertificates.length === 0 ? (
            <EmptyState icon={GraduationCap} title="No pending certificates" text="Degree and document verification requests are clear." />
          ) : pendingCertificates.map((user) => (
            <div key={user.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="truncate text-xl font-bold text-slate-950">{user.name}</h2>
                  <p className="truncate text-sm font-medium text-slate-500">{user.email}</p>
                </div>
                <StatusPill status={user.accountStatus} />
              </div>
              <div className="space-y-3">
                {user.pendingCertificates.map((certificate) => (
                  <div key={certificate.index} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-950">{certificate.degree || 'Certificate'}</p>
                        <p className="mt-1 truncate text-sm font-medium text-slate-500">{certificate.fileName || 'Uploaded document'}</p>
                        <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-400">Uploaded {formatDate(certificate.uploadedAt)}</p>
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row">
                        {certificate.fileUrl && (
                          <ActionButton tone="subtle" onClick={() => window.open(certificate.fileUrl, '_blank', 'noreferrer')}>
                            Review
                          </ActionButton>
                        )}
                        <ActionButton tone="success" onClick={() => runAction(() => updateAdminCertificateStatus(user.id, certificate.index, 'verified'), 'Certificate verified')}>
                          Verify
                        </ActionButton>
                        <ActionButton tone="danger" onClick={() => runAction(() => updateAdminCertificateStatus(user.id, certificate.index, 'rejected'), 'Certificate rejected')}>
                          Reject
                        </ActionButton>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {tab === 'articles' && (
        <section className="space-y-4">
          {pendingArticles.length === 0 ? (
            <EmptyState icon={FileText} title="No pending articles" text="Article review queue is clear." />
          ) : pendingArticles.map((article) => (
            <div key={article.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <StatusPill status={article.status} />
                    <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">{article.category || 'General'}</span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-950">{article.title}</h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">By {article.authorName} on {formatDate(article.createdAt)}</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">AI score</p>
                      <p className="mt-1 font-bold text-slate-900">{formatPercent(article.aiScore)}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Plagiarism</p>
                      <p className="mt-1 font-bold text-slate-900">{formatPercent(article.plagiarismScore)}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Profile risk</p>
                      <p className="mt-1 font-bold text-slate-900">{formatPercent(article.fakeProfileScore)}</p>
                    </div>
                  </div>
                  <p className="mt-4 line-clamp-4 text-sm leading-6 text-slate-600">{article.content}</p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                  <ActionButton tone="success" onClick={() => runAction(() => updateArticleStatus(article.id, 'published'), 'Article published')}>
                    Publish
                  </ActionButton>
                  <ActionButton tone="danger" onClick={() => runAction(() => updateArticleStatus(article.id, 'rejected', 'Rejected during moderation review'), 'Article rejected')}>
                    Reject
                  </ActionButton>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      {tab === 'ads' && (
        <section className="space-y-4">
          {pendingAds.length === 0 ? (
            <EmptyState icon={Megaphone} title="No pending ads" text="Campaign moderation queue is clear." />
          ) : pendingAds.map((ad) => (
            <div key={ad.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <StatusPill status={ad.status} />
                    <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold capitalize text-blue-700">{ad.placement}</span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold capitalize text-slate-600">{roleLabel(ad.advertiserRole)}</span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-950">{ad.title}</h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">By {ad.advertiserName} on {formatDate(ad.createdAt)}</p>
                  <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">{ad.description}</p>
                  <div className="mt-4 flex flex-wrap gap-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <span className="rounded-lg bg-slate-50 px-3 py-2">Budget: {ad.budget || 'N/A'}</span>
                    <span className="rounded-lg bg-slate-50 px-3 py-2">Audience: {(ad.targetAudience || []).join(', ') || 'All'}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
                  <ActionButton tone="success" onClick={() => runAction(() => updateAdStatus(ad.id, 'approved'), 'Campaign approved')}>
                    Approve
                  </ActionButton>
                  <ActionButton tone="danger" onClick={() => runAction(() => updateAdStatus(ad.id, 'rejected', 'Rejected during moderation review'), 'Campaign rejected')}>
                    Reject
                  </ActionButton>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
