import { useState, useEffect } from 'react';
import { getAllUsers, updateAccountStatus, updateCertificateStatus } from '../../api/profile';
import { updateArticleStatus } from '../../api/articles';
import { getPendingAds, updateAdStatus } from '../../api/ads';
import { apiFetch } from '../../api/http';
import { Building2, GraduationCap, FileText, ShieldCheck, Sparkles, ScrollText, Bot, CheckCircle2, Megaphone } from 'lucide-react';

const ADMIN_TABS = ['institutions', 'certificates', 'articles', 'ads'];

export default function AdminPage() {
  const [tab, setTab] = useState('institutions');
  const [pendingInstitutions, setPendingInstitutions] = useState([]);
  const [pendingCerts, setPendingCerts] = useState([]);
  const [pendingArticles, setPendingArticles] = useState([]);
  const [pendingAds, setPendingAds] = useState([]);
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
      setPendingAds(await getPendingAds());
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleInstitution = async (uid, status) => {
    setMsg('');
    await updateAccountStatus(uid, status);
    setMsg(`Institution ${status}`);
    setTimeout(() => setMsg(''), 3000);
    load();
  };

  const handleCert = async (uid, certIndex, status) => {
    setMsg('');
    await updateCertificateStatus(uid, certIndex, status);
    setMsg(`Certificate ${status}`);
    setTimeout(() => setMsg(''), 3000);
    load();
  };

  const handleArticle = async (articleId, status, reason = '') => {
    setMsg('');
    await updateArticleStatus(articleId, status, reason);
    setMsg(`Article ${status}`);
    setTimeout(() => setMsg(''), 3000);
    load();
  };

  const handleAd = async (adId, status, reason = '') => {
    setMsg('');
    await updateAdStatus(adId, status, reason);
    setMsg(`Campaign ${status}`);
    setTimeout(() => setMsg(''), 3000);
    load();
  };

  const tabs = {
    institutions: { label: 'Institutions', icon: <Building2 className="w-8 h-8" />, count: pendingInstitutions.length },
    certificates: { label: 'Certificates', icon: <GraduationCap className="w-8 h-8" />, count: pendingCerts.length },
    articles: { label: 'Articles', icon: <FileText className="w-8 h-8" />, count: pendingArticles.length },
    ads: { label: 'Ads', icon: <Megaphone className="w-8 h-8" />, count: pendingAds.length },
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 lg:space-y-8 animate-fade-in pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-gradient-to-r from-slate-900 to-slate-800 p-8 rounded-[2rem] shadow-xl text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-red-500 rounded-full blur-[80px] opacity-20 -translate-y-1/2 translate-x-1/2" />
        <div className="absolute left-0 bottom-0 w-64 h-64 bg-primary-500 rounded-full blur-[80px] opacity-20 translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10">
          <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight mb-2 flex items-center gap-3">
            Admin Command Center <span className="bg-red-500 text-white text-xs px-2.5 py-1 rounded-md uppercase tracking-widest font-bold">Root</span>
          </h1>
          <p className="text-slate-300 font-medium">Review pending approvals and manage platform integrity.</p>
        </div>
        
        <button 
          onClick={load} 
          disabled={loading} 
          className="relative z-10 flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all border border-white/10 shadow-sm backdrop-blur-sm"
        >
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {loading ? 'Syncing...' : 'Sync Data'}
        </button>
      </div>

      {msg && (
        <div className="rounded-xl p-4 text-sm font-bold border flex items-center gap-3 shadow-sm bg-emerald-50 text-emerald-800 border-emerald-200 animate-slide-up">
          <ShieldCheck className="w-6 h-6 text-emerald-600" />
          {msg}
        </div>
      )}

      {/* Stats Navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
        {Object.entries(tabs).map(([key, { label, icon, count }]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`glass-panel rounded-[2rem] p-6 text-left transition-all duration-300 border relative overflow-hidden group ${
              tab === key 
                ? 'bg-white shadow-xl border-primary-200 ring-2 ring-primary-500 ring-offset-2' 
                : 'border-white/60 hover:shadow-lg hover:-translate-y-1'
            }`}
          >
            <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-[40px] -z-10 transition-opacity ${
              tab === key ? 'bg-primary-100 opacity-100' : 'bg-slate-100 opacity-0 group-hover:opacity-50'
            }`} />
            
            <div className="flex items-start justify-between">
              <div>
                <span className="text-2xl mb-3 block">{icon}</span>
                <p className={`text-sm font-bold uppercase tracking-widest ${tab === key ? 'text-primary-600' : 'text-slate-500'}`}>{label}</p>
              </div>
              <div className={`text-3xl font-display font-bold ${
                count > 0 
                  ? 'text-red-500' 
                  : tab === key ? 'text-slate-900' : 'text-slate-400'
              }`}>
                {count}
              </div>
            </div>
            {count > 0 && (
              <div className="mt-4">
                <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-md border border-red-100 uppercase tracking-wider">
                  Action Required
                </span>
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="glass-panel rounded-[2rem] shadow-sm border border-white/60 overflow-hidden relative min-h-[400px]">
        {/* Institutions */}
        {tab === 'institutions' && (
          <div className="p-8 animate-fade-in">
            <h2 className="font-display font-bold text-2xl text-slate-900 mb-6 flex items-center gap-3">
              <span className="bg-slate-100 w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border border-slate-200"><Building2 className="w-5 h-5 text-slate-600" /></span>
              Pending Institutions
            </h2>
            
            {pendingInstitutions.length === 0 ? (
              <div className="text-center py-16 bg-white/40 rounded-3xl border border-slate-200 border-dashed">
                <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-lg font-bold text-slate-600">All caught up!</p>
                <p className="text-slate-500 font-medium mt-1">No pending institution registrations.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingInstitutions.map(inst => (
                  <div key={inst.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="font-bold text-xl text-slate-900">{inst.name}</p>
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded uppercase tracking-widest border border-amber-200">Pending</span>
                      </div>
                      <p className="text-sm font-medium text-slate-500 mb-3">{inst.email}</p>
                      
                      <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                        <span className="bg-slate-50 px-2 py-1 rounded border border-slate-100">Type: {inst.role?.replace('_',' ')}</span>
                        <span className="bg-slate-50 px-2 py-1 rounded border border-slate-100">Applied: {inst.createdAt ? new Date(inst.createdAt).toLocaleDateString() : 'N/A'}</span>
                      </div>
                      
                      {inst.bio && (
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 mt-2">
                          <p className="text-sm text-slate-600 leading-relaxed font-serif italic">"{inst.bio}"</p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-row md:flex-col gap-3 shrink-0">
                      <button onClick={() => handleInstitution(inst.id, 'active')} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-700 shadow-sm transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                        Approve
                      </button>
                      <button onClick={() => handleInstitution(inst.id, 'rejected')} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white text-red-600 border border-red-200 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-red-50 shadow-sm transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Certificates */}
        {tab === 'certificates' && (
          <div className="p-8 animate-fade-in">
            <h2 className="font-display font-bold text-2xl text-slate-900 mb-6 flex items-center gap-3">
              <span className="bg-slate-100 w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border border-slate-200"><GraduationCap className="w-5 h-5 text-slate-600" /></span>
              Pending Certificates
            </h2>
            
            {pendingCerts.length === 0 ? (
              <div className="text-center py-16 bg-white/40 rounded-3xl border border-slate-200 border-dashed">
                <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-lg font-bold text-slate-600">All caught up!</p>
                <p className="text-slate-500 font-medium mt-1">No pending degree verifications.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {pendingCerts.map(user => (
                  <div key={user.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center gap-4 mb-4 pb-4 border-b border-slate-100">
                      <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=e2e8f0&color=475569&size=48`} className="w-12 h-12 rounded-full" alt="" />
                      <div>
                        <p className="font-bold text-lg text-slate-900">{user.name}</p>
                        <p className="text-sm font-medium text-slate-500">{user.email}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      {user.pendingCerts.map((cert) => (
                        <div key={cert.index} className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-5">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <ScrollText className="w-5 h-5 text-slate-600" />
                              <p className="font-bold text-slate-900">{cert.degree}</p>
                            </div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2 mb-1">Document Info</p>
                            <p className="text-sm font-medium text-slate-600 font-mono bg-white inline-block px-2 py-1 rounded border border-slate-200">{cert.fileName}</p>
                            <p className="text-xs text-slate-400 mt-2">Uploaded: {new Date(cert.uploadedAt).toLocaleDateString()}</p>
                          </div>
                          
                          <div className="flex flex-col gap-3 shrink-0">
                            <a 
                              href={cert.fileUrl} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="flex items-center justify-center gap-2 bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-100 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                              Review Document
                            </a>
                            <div className="flex gap-2">
                              <button onClick={() => handleCert(user.id, cert.index, 'verified')} className="flex-1 flex items-center justify-center bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-emerald-700 shadow-sm transition-colors">
                                Verify
                              </button>
                              <button onClick={() => handleCert(user.id, cert.index, 'rejected')} className="flex-1 flex items-center justify-center bg-white text-red-600 border border-red-200 px-3 py-2 rounded-lg text-sm font-bold hover:bg-red-50 shadow-sm transition-colors">
                                Reject
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Articles */}
        {tab === 'articles' && (
          <div className="p-8 animate-fade-in">
            <h2 className="font-display font-bold text-2xl text-slate-900 mb-6 flex items-center gap-3">
              <span className="bg-slate-100 w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border border-slate-200"><FileText className="w-5 h-5 text-slate-600" /></span>
              Pending Articles
            </h2>
            
            {pendingArticles.length === 0 ? (
              <div className="text-center py-16 bg-white/40 rounded-3xl border border-slate-200 border-dashed">
                <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-lg font-bold text-slate-600">All caught up!</p>
                <p className="text-slate-500 font-medium mt-1">No articles pending review.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingArticles.map(article => (
                  <div key={article.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded uppercase tracking-widest border border-indigo-200">{article.category}</span>
                          <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded uppercase tracking-widest border border-amber-200">Pending Review</span>
                        </div>
                        
                        <p className="font-bold text-xl text-slate-900 mb-1">{article.title}</p>
                        <p className="text-sm font-medium text-slate-500 mb-4 flex items-center gap-2">
                          <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(article.authorName)}&background=e2e8f0&color=475569&size=20`} className="w-5 h-5 rounded-full" alt="" />
                          {article.authorName}
                        </p>
                        
                        {article.aiScore !== null && (
                          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-wrap items-center gap-4 mb-4">
                            <div className="flex items-center gap-2">
                              <Bot className="w-6 h-6 text-slate-400" />
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AI Content Score</p>
                                <p className={`text-sm font-bold ${(article.aiScore * 100) > 70 ? 'text-red-600' : 'text-emerald-600'}`}>
                                  {(article.aiScore * 100).toFixed(0)}% Match
                                </p>
                              </div>
                            </div>
                            {article.aiCategory && (
                              <div className="h-8 w-px bg-slate-200"></div>
                            )}
                            {article.aiCategory && (
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Classification</p>
                                <span className="text-xs font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded">{article.aiCategory}</span>
                              </div>
                            )}
                            {article.plagiarismScore !== null && (
                              <>
                                <div className="h-8 w-px bg-slate-200"></div>
                                <div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Plagiarism Risk</p>
                                  <span className="text-xs font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded">{Math.round(article.plagiarismScore * 100)}%</span>
                                </div>
                              </>
                            )}
                            {article.fakeProfileScore !== null && (
                              <>
                                <div className="h-8 w-px bg-slate-200"></div>
                                <div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Profile Risk</p>
                                  <span className="text-xs font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded">{Math.round(article.fakeProfileScore * 100)}%</span>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                        
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                          <p className="text-sm text-slate-600 leading-relaxed font-serif line-clamp-3">"{article.content}"</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-row md:flex-col gap-3 shrink-0">
                        <button onClick={() => handleArticle(article.id, 'published')} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-700 shadow-sm transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                          Publish
                        </button>
                        <button onClick={() => handleArticle(article.id, 'rejected', 'Content policy violation')} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white text-red-600 border border-red-200 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-red-50 shadow-sm transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'ads' && (
          <div className="p-8 animate-fade-in">
            <h2 className="font-display font-bold text-2xl text-slate-900 mb-6 flex items-center gap-3">
              <span className="bg-slate-100 w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border border-slate-200"><Megaphone className="w-5 h-5 text-slate-600" /></span>
              Pending Campaigns
            </h2>

            {pendingAds.length === 0 ? (
              <div className="text-center py-16 bg-white/40 rounded-3xl border border-slate-200 border-dashed">
                <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-lg font-bold text-slate-600">All caught up!</p>
                <p className="text-slate-500 font-medium mt-1">No campaigns pending approval.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingAds.map((ad) => (
                  <div key={ad.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded uppercase tracking-widest border border-amber-200">{ad.placement}</span>
                        <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded uppercase tracking-widest border border-blue-200">{ad.advertiserRole}</span>
                      </div>
                      <p className="font-bold text-xl text-slate-900">{ad.title}</p>
                      <p className="text-sm text-slate-500 mb-3">{ad.advertiserName}</p>
                      <p className="text-slate-600 leading-relaxed">{ad.description}</p>
                    </div>

                    <div className="flex flex-row md:flex-col gap-3 shrink-0">
                      <button onClick={() => handleAd(ad.id, 'approved')} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-700 shadow-sm transition-colors">
                        Approve
                      </button>
                      <button onClick={() => handleAd(ad.id, 'rejected', 'Campaign rejected during moderation review')} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white text-red-600 border border-red-200 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-red-50 shadow-sm transition-colors">
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
