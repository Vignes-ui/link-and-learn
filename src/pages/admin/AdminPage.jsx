import { useState, useEffect } from 'react';
import { getAllUsers, updateAccountStatus, updateCertificateStatus } from '../../api/profile';
import { updateArticleStatus } from '../../api/articles';
import { apiFetch } from '../../api/http';

const ADMIN_TABS = ['institutions', 'certificates', 'articles'];

export default function AdminPage() {
  const [tab, setTab] = useState('institutions');
  const [pendingInstitutions, setPendingInstitutions] = useState([]);
  const [pendingCerts, setPendingCerts] = useState([]);
  const [pendingArticles, setPendingArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const users = await getAllUsers();
      setPendingInstitutions(users.filter(u => u.accountStatus === 'pending' && u.loginType === 'institutional'));
      setPendingCerts(users.filter(u => (u.certificates || []).some(c => c.status === 'pending')).map(u => ({
        ...u,
        pendingCerts: (u.certificates || []).map((c, i) => ({ ...c, index: i })).filter(c => c.status === 'pending')
      })));
      const { articles } = await apiFetch('/api/articles?status=pending');
      setPendingArticles(articles || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleInstitution = async (uid, status) => {
    setMsg('');
    await updateAccountStatus(uid, status);
    setMsg(`✅ Institution ${status}`);
    load();
  };

  const handleCert = async (uid, certIndex, status) => {
    setMsg('');
    await updateCertificateStatus(uid, certIndex, status);
    setMsg(`✅ Certificate ${status}`);
    load();
  };

  const handleArticle = async (articleId, status, reason = '') => {
    setMsg('');
    await updateArticleStatus(articleId, status, reason);
    setMsg(`✅ Article ${status}`);
    load();
  };

  const tabs = {
    institutions: { label: 'Institutions', count: pendingInstitutions.length },
    certificates: { label: 'Certificates', count: pendingCerts.length },
    articles: { label: 'Articles', count: pendingArticles.length },
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">🛡 Admin Panel</h1>
        <button onClick={load} disabled={loading} className="text-sm text-blue-600 hover:underline">{loading ? 'Refreshing...' : '🔄 Refresh'}</button>
      </div>

      {msg && <div className="bg-green-50 text-green-700 rounded-xl p-3 text-sm">{msg}</div>}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {Object.entries(tabs).map(([key, { label, count }]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-2xl p-5 text-left shadow transition-all ${tab === key ? 'bg-blue-600 text-white' : 'bg-white hover:shadow-md'}`}
          >
            <p className={`text-sm ${tab === key ? 'text-blue-200' : 'text-gray-500'}`}>{label} Pending</p>
            <p className={`text-3xl font-bold mt-1 ${count > 0 ? (tab === key ? 'text-white' : 'text-red-600') : ''}`}>{count}</p>
          </button>
        ))}
      </div>

      {/* Institutions */}
      {tab === 'institutions' && (
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="font-bold text-lg mb-4">Pending Institution Approvals</h2>
          {pendingInstitutions.length === 0 && <p className="text-gray-400 text-center py-8">No pending institutions 🎉</p>}
          {pendingInstitutions.map(inst => (
            <div key={inst.id} className="border border-gray-200 rounded-xl p-4 mb-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="font-semibold">{inst.name}</p>
                  <p className="text-sm text-gray-500">{inst.email}</p>
                  <p className="text-xs text-gray-400 capitalize mt-1">Type: {inst.role?.replace('_',' ')} · Applied: {inst.createdAt ? new Date(inst.createdAt).toLocaleDateString() : ''}</p>
                  {inst.bio && <p className="text-sm text-gray-600 mt-1">{inst.bio}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleInstitution(inst.id, 'active')} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">✅ Approve</button>
                  <button onClick={() => handleInstitution(inst.id, 'rejected')} className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-600">❌ Reject</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Certificates */}
      {tab === 'certificates' && (
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="font-bold text-lg mb-4">Pending Certificate Verifications</h2>
          {pendingCerts.length === 0 && <p className="text-gray-400 text-center py-8">No pending certificates 🎉</p>}
          {pendingCerts.map(user => (
            <div key={user.id} className="border border-gray-200 rounded-xl p-4 mb-3">
              <p className="font-semibold">{user.name}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
              {user.pendingCerts.map((cert) => (
                <div key={cert.index} className="mt-3 bg-gray-50 rounded-lg p-3">
                  <p className="font-medium text-sm">{cert.degree}</p>
                  <p className="text-xs text-gray-500">{cert.fileName} · Uploaded {new Date(cert.uploadedAt).toLocaleDateString()}</p>
                  <a href={cert.fileUrl} target="_blank" rel="noreferrer" className="text-blue-600 text-xs underline mt-1 block">📎 View Document</a>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => handleCert(user.id, cert.index, 'verified')} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-green-700">✅ Verify</button>
                    <button onClick={() => handleCert(user.id, cert.index, 'rejected')} className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-red-600">❌ Reject</button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Articles */}
      {tab === 'articles' && (
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="font-bold text-lg mb-4">Articles Pending Review</h2>
          {pendingArticles.length === 0 && <p className="text-gray-400 text-center py-8">No pending articles 🎉</p>}
          {pendingArticles.map(article => (
            <div key={article.id} className="border border-gray-200 rounded-xl p-4 mb-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1">
                  <p className="font-semibold">{article.title}</p>
                  <p className="text-sm text-gray-500">{article.authorName} · {article.category}</p>
                  {article.aiScore !== null && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                        🤖 AI Score: {(article.aiScore * 100).toFixed(0)}%
                      </span>
                      {article.aiCategory && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{article.aiCategory}</span>}
                    </div>
                  )}
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">{article.content?.slice(0, 200)}...</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => handleArticle(article.id, 'published')} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-green-700">✅ Publish</button>
                  <button onClick={() => handleArticle(article.id, 'rejected', 'Content policy violation')} className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-red-600">❌ Reject</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
