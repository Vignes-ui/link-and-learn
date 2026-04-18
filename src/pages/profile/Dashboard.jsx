import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../api/http';
import { Home, FileText, Briefcase, CalendarDays, BookOpen, MessageSquare, Building2, ShieldCheck, Clock, CheckCircle2, AlertTriangle, Zap, Sparkles, Mailbox, Hand } from 'lucide-react';

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
    { label: 'Professional Feed', path: '/feed', show: true, icon: <FileText className="w-6 h-6" />, color: 'from-blue-500 to-blue-600' },
    { label: 'Journals & Articles', path: '/articles', show: true, icon: <BookOpen className="w-6 h-6" />, color: 'from-indigo-500 to-indigo-600' },
    { label: 'Recruitment', path: '/recruitment', show: true, icon: <Briefcase className="w-6 h-6" />, color: 'from-purple-500 to-purple-600' },
    { label: 'Events Hub', path: '/events', show: true, icon: <CalendarDays className="w-6 h-6" />, color: 'from-rose-500 to-rose-600' },
    { label: 'Messages', path: '/messages', show: true, icon: <MessageSquare className="w-6 h-6" />, color: 'from-amber-500 to-amber-600' },
    { label: 'Vendor Connector', path: '/vendor', show: ['institution','govt_body','ngo','vendor','admin'].includes(userRole), icon: <Building2 className="w-6 h-6" />, color: 'from-emerald-500 to-emerald-600' },
    { label: 'Admin Panel', path: '/admin', show: userRole === 'admin', icon: <ShieldCheck className="w-6 h-6" />, color: 'from-slate-700 to-slate-900' },
  ].filter(l => l.show);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.04)] bg-gradient-to-r from-primary-600 via-indigo-600 to-purple-600 p-8 sm:p-12 text-white animate-fade-in group">
        <div className="absolute top-0 right-0 w-full h-full opacity-30 mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-primary-400 opacity-20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
        
        <div className="relative z-10">
          <h1 className="text-4xl sm:text-5xl font-display font-bold tracking-tight mb-2 flex items-center gap-3">
            Welcome back, {userData?.name || 'User'} <Hand className="w-10 h-10 animate-[wave_2s_ease-in-out_infinite] origin-[70%_70%] inline-block text-amber-200" />
          </h1>
          <div className="flex items-center gap-3 mt-4">
            <span className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-sm font-semibold capitalize tracking-wide shadow-sm">
              {userRole?.replace('_',' ')}
            </span>
            <span className={`px-4 py-1.5 rounded-full text-sm font-semibold tracking-wide shadow-sm backdrop-blur-md flex items-center gap-2 ${userData?.accountStatus === 'pending' ? 'bg-amber-400/20 text-amber-100 border border-amber-400/30' : 'bg-emerald-400/20 text-emerald-100 border border-emerald-400/30'}`}>
              {userData?.accountStatus === 'pending' ? <><Clock className="w-4 h-4" /> Pending approval</> : <><CheckCircle2 className="w-4 h-4" /> Active account</>}
            </span>
          </div>
          {userData?.accountStatus === 'pending' && (
            <div className="mt-6 bg-amber-500/20 border border-amber-400/40 text-amber-50 rounded-2xl px-5 py-3 text-sm font-medium inline-flex items-center gap-3 backdrop-blur-md animate-pulse-soft">
              <AlertTriangle className="w-5 h-5 text-amber-300" /> Your institutional account is awaiting platform admin approval to unlock full features.
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
        {[
          { label: 'My Posts', value: stats.posts, icon: <FileText className="w-6 h-6" />, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Applications', value: stats.applications, icon: <Briefcase className="w-6 h-6" />, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Events Joined', value: stats.events, icon: <CalendarDays className="w-6 h-6" />, color: 'text-rose-600', bg: 'bg-rose-50' },
          { label: 'Articles', value: stats.articles, icon: <BookOpen className="w-6 h-6" />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        ].map((s,i) => (
          <div key={i} className="glass-panel rounded-3xl p-6 hover:-translate-y-1 hover:shadow-xl transition-all duration-300 group border border-white/60">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-2xl ${s.bg} flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
                {s.icon}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{s.label}</p>
              <div className="flex items-end gap-2 mt-1">
                <p className={`text-4xl font-display font-bold ${s.color}`}>
                  {loading ? (
                    <div className="h-10 w-16 bg-slate-200 animate-pulse rounded-lg" />
                  ) : s.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Quick Links */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-xl font-display font-bold text-slate-900 px-2 flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary-500" /> Quick Access
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {quickLinks.map((link, idx) => (
              <button 
                key={link.path} 
                onClick={() => navigate(link.path)}
                className="group relative overflow-hidden glass-panel rounded-2xl p-4 flex items-center gap-4 border border-white/60 hover:shadow-lg transition-all duration-300 text-left hover:-translate-y-0.5"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${link.color} flex items-center justify-center text-xl shadow-md group-hover:scale-110 transition-transform duration-300`}>
                  <span className="text-white drop-shadow-sm">{link.icon}</span>
                </div>
                <div className="flex-1">
                  <span className="font-semibold text-slate-800 group-hover:text-primary-600 transition-colors block text-base">
                    {link.label}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">Click to explore →</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-display font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary-500" /> Recent Feed Activity
            </h2>
            <button onClick={() => navigate('/feed')} className="text-sm font-semibold text-primary-600 hover:text-primary-700 bg-primary-50 px-4 py-2 rounded-full hover:bg-primary-100 transition-colors">
              View all
            </button>
          </div>
          
          <div className="glass-panel rounded-[2rem] p-6 border border-white/60 shadow-sm min-h-[300px]">
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center px-4 animate-fade-in">
                <Mailbox className="w-10 h-10 mb-3 text-slate-300" />
                <p className="text-slate-500 font-medium">No recent activity found.</p>
                <p className="text-sm text-slate-400 mt-1">Check back later or start posting!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((post, idx) => (
                  <div key={post.id} className="group flex items-start gap-4 p-4 rounded-2xl hover:bg-white/60 transition-all duration-300 border border-transparent hover:border-slate-100 hover:shadow-sm">
                    <img 
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(post.authorName||'U')}&background=3b82f6&color=fff&size=48`} 
                      className="w-12 h-12 rounded-full flex-shrink-0 shadow-sm ring-2 ring-transparent group-hover:ring-primary-100 transition-all" 
                      alt="" 
                    />
                    <div className="flex-1 min-w-0 pt-1">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-sm font-bold text-slate-900 truncate group-hover:text-primary-600 transition-colors">{post.authorName}</p>
                        <p className="text-xs font-medium text-slate-400 whitespace-nowrap">{timeAgo(post.createdAt)}</p>
                      </div>
                      <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">{post.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Wave animation keyframes needed for the hand wave */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes wave {
          0% { transform: rotate(0.0deg) }
          10% { transform: rotate(14.0deg) }
          20% { transform: rotate(-8.0deg) }
          30% { transform: rotate(14.0deg) }
          40% { transform: rotate(-4.0deg) }
          50% { transform: rotate(10.0deg) }
          60% { transform: rotate(0.0deg) }
          100% { transform: rotate(0.0deg) }
        }
      `}} />
    </div>
  );
}
