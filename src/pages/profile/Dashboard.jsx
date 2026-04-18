import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../api/http';

export default function Dashboard() {
  const { currentUser, userData, userRole } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ posts: 0, applications: 0, events: 0, articles: 0 });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    const loadStats = async () => {
      try {
        const [{ posts }, { vacancies }, { events }, { articles }, feed] = await Promise.all([
          apiFetch('/api/posts?limit=100'),
          apiFetch('/api/vacancies?status=open'),
          apiFetch('/api/events'),
          apiFetch('/api/articles/mine'),
          apiFetch('/api/posts?limit=5'),
        ]);

        const myPostCount = (posts || []).filter(p => p.uid === currentUser.uid).length;
        const applied = (vacancies || []).filter(v => (v.applicants || []).some(a => a.uid === currentUser.uid)).length;
        // Backend doesn't return attendees list in browse events; approximate via registrations endpoint
        const regs = await apiFetch('/api/events/registrations/mine');
        const evtReg = (regs.events || []).length;
        const myArticles = (articles || []).length;

        setStats({ posts: myPostCount, applications: applied, events: evtReg, articles: myArticles });
        setRecentActivity(feed?.posts || []);
      } catch(e){ console.error(e); } finally { setLoading(false); }
    };
    loadStats();
  }, [currentUser]);

  const timeAgo = (ts) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const secs = Math.floor((Date.now()-d)/1000);
    if (secs < 3600) return Math.floor(secs/60) + 'm ago';
    if (secs < 86400) return Math.floor(secs/3600) + 'h ago';
    return Math.floor(secs/86400) + 'd ago';
  };

  const isInstitutional = ['institution','govt_body','ngo','vendor'].includes(userRole);
  const quickLinks = [
    { label: '📝 Professional Feed', path: '/feed', show: true },
    { label: '📚 Journals & Articles', path: '/articles', show: true },
    { label: '💼 Recruitment', path: '/recruitment', show: true },
    { label: '🗓 Events', path: '/events', show: true },
    { label: '💬 Messages', path: '/messages', show: true },
    { label: '🏭 Vendor Connector', path: '/vendor', show: ['institution','govt_body','ngo','vendor','admin'].includes(userRole) },
    { label: '🛡 Admin Panel', path: '/admin', show: userRole === 'admin' },
  ].filter(l => l.show);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold">Welcome back, {userData?.name || 'User'} 👋</h1>
        <p className="text-blue-200 mt-1 capitalize">{userRole?.replace('_',' ')} · {userData?.accountStatus === 'pending' ? '⏳ Pending approval' : '✅ Active account'}</p>
        {userData?.accountStatus === 'pending' && (
          <div className="mt-3 bg-amber-400 text-amber-900 rounded-xl px-4 py-2 text-sm font-medium inline-block">
            Your institutional account is awaiting admin approval
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'My Posts', value: stats.posts, icon: '📝' },
          { label: 'Applications', value: stats.applications, icon: '💼' },
          { label: 'Events Joined', value: stats.events, icon: '🗓' },
          { label: 'Articles', value: stats.articles, icon: '📄' },
        ].map((s,i) => (
          <div key={i} className="bg-white rounded-2xl shadow p-5">
            <div className="text-2xl mb-1">{s.icon}</div>
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{loading ? '—' : s.value}</p>
          </div>
        ))}
      </div>
      <div className="grid md:grid-cols-3 gap-5">
        <div className="md:col-span-1 bg-white rounded-2xl shadow p-5">
          <h2 className="font-bold text-gray-900 mb-4">Quick Access</h2>
          <div className="space-y-1">
            {quickLinks.map(link => (
              <button key={link.path} onClick={() => navigate(link.path)}
                className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-50 hover:text-blue-700 transition-colors text-gray-700">
                {link.label}
              </button>
            ))}
          </div>
        </div>
        <div className="md:col-span-2 bg-white rounded-2xl shadow p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Recent Feed Activity</h2>
            <button onClick={() => navigate('/feed')} className="text-sm text-blue-600 hover:underline">View feed →</button>
          </div>
          {recentActivity.length === 0 && <p className="text-gray-400 text-sm text-center py-8">No recent activity</p>}
          <div className="space-y-3">
            {recentActivity.map(post => (
              <div key={post.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50">
                <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(post.authorName||'U')}&background=3b82f6&color=fff&size=36`} className="w-9 h-9 rounded-full flex-shrink-0" alt="" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{post.authorName}</p>
                  <p className="text-sm text-gray-600 line-clamp-2">{post.content}</p>
                  <p className="text-xs text-gray-400 mt-1">{timeAgo(post.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
