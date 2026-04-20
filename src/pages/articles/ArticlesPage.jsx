import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { publishArticle, subscribeArticles, getMyArticles, deleteArticle } from '../../api/articles';
import { BookOpen, FileText, PenLine, CheckCircle2, AlertTriangle, Bot, Send, XCircle, Flag, Clock, PartyPopper } from 'lucide-react';

const CATEGORIES = ['Computer Science', 'Engineering', 'Life Sciences', 'Physics', 'Chemistry', 'Mathematics', 'Social Sciences', 'Education', 'Economics', 'Medicine'];

export default function ArticlesPage() {
  const { currentUser, userData } = useAuth();
  const [articles, setArticles] = useState([]);
  const [myArticles, setMyArticles] = useState([]);
  const [view, setView] = useState('browse'); // browse | write | mine
  const [selected, setSelected] = useState(null);

  // Write form
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [tags, setTags] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [msg, setMsg] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const canPublish = ['researcher', 'institution', 'govt_body', 'ngo', 'admin'].includes(userData?.role);
  const filteredArticles = articles.filter((article) => {
    const q = search.trim().toLowerCase();
    const matchesText = !q
      || article.title?.toLowerCase().includes(q)
      || article.content?.toLowerCase().includes(q)
      || article.authorName?.toLowerCase().includes(q)
      || (article.tags || []).some((tag) => tag.toLowerCase().includes(q));
    const matchesCategory = categoryFilter === 'All' || article.category === categoryFilter;
    return matchesText && matchesCategory;
  });

  const wrapSelection = (before, after = before) => {
    const textarea = document.getElementById('article-content-editor');
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.slice(start, end) || 'text';
    setContent(`${content.slice(0, start)}${before}${selectedText}${after}${content.slice(end)}`);
    setTimeout(() => textarea.focus(), 0);
  };

  useEffect(() => {
    const unsub = subscribeArticles(setArticles);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (view === 'mine') {
      getMyArticles().then(setMyArticles);
    }
  }, [view]);

  const handlePublish = async (e) => {
    e.preventDefault();
    if (!title || !content) return;
    setPublishing(true);
    setMsg('');
    try {
      await publishArticle(currentUser.uid, userData, {
        title,
        content,
        category,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      });
      setMsg('✅ Article submitted for review! It will be published after the AI content check.');
      setTitle(''); setContent(''); setTags('');
      setTimeout(() => setMsg(''), 6000);
    } catch {
      setMsg('❌ Failed to publish article.');
    } finally {
      setPublishing(false);
    }
  };

  if (selected) {
    return (
      <div className="max-w-4xl mx-auto animate-fade-in pb-12">
        <button onClick={() => setSelected(null)} className="group flex items-center gap-2 text-slate-500 hover:text-primary-600 font-semibold mb-6 transition-colors">
          <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          Back to journals
        </button>
        
        <article className="glass-panel rounded-[2rem] shadow-md border border-white/60 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-100 rounded-full blur-[80px] opacity-40 -z-10 translate-x-1/3 -translate-y-1/3" />
          
          <div className="p-8 sm:p-12 border-b border-slate-100">
            <span className="inline-block text-xs font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full border border-indigo-200 shadow-sm mb-4">
              {selected.category}
            </span>
            <h1 className="text-3xl sm:text-5xl font-display font-bold text-slate-900 mb-6 leading-tight tracking-tight">
              {selected.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-3">
                <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(selected.authorName)}&background=3b82f6&color=fff&size=48`} className="w-12 h-12 rounded-full shadow-sm" alt="" />
                <div>
                  <p className="text-sm font-bold text-slate-900">{selected.authorName}</p>
                  <p className="text-xs font-medium text-slate-500">Author</p>
                </div>
              </div>
              <div className="h-10 w-px bg-slate-200 hidden sm:block"></div>
              <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                {selected.createdAt ? new Date(selected.createdAt).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A'}
              </div>
            </div>
          </div>
          
          <div className="p-8 sm:p-12 bg-white/40">
            <div className="prose prose-slate max-w-none">
              <p className="text-slate-800 text-lg leading-relaxed whitespace-pre-wrap font-serif">
                {selected.content}
              </p>
            </div>
            
            {selected.tags?.length > 0 && (
              <div className="mt-12 pt-6 border-t border-slate-200">
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Tags & Topics</h4>
                <div className="flex flex-wrap gap-2">
                  {selected.tags.map(t => (
                    <span key={t} className="text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition-colors cursor-pointer border border-slate-200 shadow-sm">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </article>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 lg:space-y-8 animate-fade-in pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-gradient-to-r from-blue-900 to-indigo-900 p-8 rounded-[2rem] shadow-xl text-white relative overflow-hidden">
        <div className="absolute right-0 bottom-0 w-64 h-64 bg-blue-500 rounded-full blur-[80px] opacity-20 translate-y-1/2 translate-x-1/2" />
        
        <div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight mb-2 flex items-center gap-3">
            Journals & Articles <BookOpen className="w-8 h-8 text-blue-300" />
          </h1>
          <p className="text-blue-100 font-medium">Explore research, publications, and academic insights.</p>
        </div>
        
        <div className="flex flex-wrap gap-2 relative z-10 bg-white/10 p-1.5 rounded-2xl backdrop-blur-sm border border-white/10">
          <button 
            onClick={() => setView('browse')} 
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${view === 'browse' ? 'bg-white text-slate-900 shadow-md' : 'text-white hover:bg-white/20'}`}
          >
            Browse
          </button>
          {canPublish && (
            <button 
              onClick={() => setView('write')} 
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${view === 'write' ? 'bg-white text-slate-900 shadow-md' : 'text-white hover:bg-white/20'}`}
            >
              Write Article
            </button>
          )}
          {userData?.role !== 'student' && (
            <button 
              onClick={() => setView('mine')} 
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${view === 'mine' ? 'bg-white text-slate-900 shadow-md' : 'text-white hover:bg-white/20'}`}
            >
              My Articles
            </button>
          )}
        </div>
      </div>

      {/* Browse */}
      {view === 'browse' && (
        <div className="space-y-6 animate-slide-up">
          <div className="glass-panel rounded-2xl border border-white/60 p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-[1fr_220px]">
              <input
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Search articles, tags, authors"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary-500"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="All">All categories</option>
                {CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
          </div>

          {filteredArticles.length === 0 && (
            <div className="text-center py-24 glass-panel rounded-[2rem] border border-white/60">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 border border-slate-200 shadow-inner">
                <FileText className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-display font-bold text-slate-900 mb-2">No articles found</h3>
              <p className="text-slate-500 font-medium">Try another search or category.</p>
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-6">
            {filteredArticles.map((article, idx) => (
              <div 
                key={article.id} 
                className="glass-panel rounded-[2rem] p-6 sm:p-8 hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 cursor-pointer border border-white/60 group relative overflow-hidden flex flex-col"
                onClick={() => setSelected(article)}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100 rounded-full blur-[40px] opacity-0 group-hover:opacity-50 transition-opacity duration-500 -z-10" />
                
                <div className="flex items-start justify-between gap-4 mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full border border-indigo-200 shadow-sm">
                    {article.category}
                  </span>
                </div>
                
                <h2 className="text-2xl font-display font-bold text-slate-900 mb-3 group-hover:text-primary-600 transition-colors leading-snug line-clamp-2">
                  {article.title}
                </h2>
                
                <p className="text-slate-600 leading-relaxed line-clamp-3 mb-6 flex-1 font-serif">
                  {article.content}
                </p>
                
                <div className="mt-auto pt-5 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(article.authorName)}&background=3b82f6&color=fff&size=32`} className="w-8 h-8 rounded-full shadow-sm" alt="" />
                      <p className="text-sm font-bold text-slate-900">{article.authorName}</p>
                    </div>
                    <p className="text-xs font-semibold text-slate-400">
                      {article.createdAt ? new Date(article.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                    </p>
                  </div>
                  
                  {article.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {article.tags.slice(0, 3).map(t => (
                        <span key={t} className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-2.5 py-1 rounded-md border border-slate-200">
                          #{t}
                        </span>
                      ))}
                      {article.tags.length > 3 && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-50 text-slate-400 px-2.5 py-1 rounded-md border border-slate-100">
                          +{article.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Write */}
      {view === 'write' && canPublish && (
        <div className="max-w-4xl mx-auto glass-panel rounded-[2rem] shadow-lg p-8 sm:p-10 border border-white/60 animate-slide-up relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-100 rounded-full blur-[80px] opacity-40 -z-10" />
          
          <h2 className="text-2xl font-display font-bold text-slate-900 mb-6 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center border border-indigo-200 shadow-sm"><PenLine className="w-5 h-5" /></span>
            Publish New Article
          </h2>
          
          {msg && (
            <div className={`rounded-xl p-4 text-sm font-medium border mb-8 flex items-center gap-3 shadow-sm ${msg.startsWith('✅') ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
              {msg.startsWith('✅') ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertTriangle className="w-5 h-5 text-red-500" />}
              {msg.replace('✅ ', '').replace('❌ ', '')}
            </div>
          )}
          
          <form onSubmit={handlePublish} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Article Title</label>
              <input 
                className="w-full bg-white border border-slate-200 p-4 text-lg font-bold rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all" 
                placeholder="Enter a compelling title..." 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                required 
              />
            </div>
            
            <div className="space-y-2 md:w-1/2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Category</label>
              <div className="relative">
                <select 
                  className="w-full appearance-none bg-white border border-slate-200 p-3.5 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all cursor-pointer font-medium" 
                  value={category} 
                  onChange={e => setCategory(e.target.value)}
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">▼</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Article Content</label>
              <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-2">
                <button type="button" onClick={() => wrapSelection('**')} className="rounded-lg px-3 py-1.5 text-sm font-bold hover:bg-slate-100">B</button>
                <button type="button" onClick={() => wrapSelection('_')} className="rounded-lg px-3 py-1.5 text-sm italic hover:bg-slate-100">I</button>
                <button type="button" onClick={() => wrapSelection('## ', '')} className="rounded-lg px-3 py-1.5 text-sm font-bold hover:bg-slate-100">H2</button>
                <button type="button" onClick={() => wrapSelection('- ', '')} className="rounded-lg px-3 py-1.5 text-sm font-bold hover:bg-slate-100">List</button>
                <button type="button" onClick={() => wrapSelection('[', '](https://)')} className="rounded-lg px-3 py-1.5 text-sm font-bold hover:bg-slate-100">Link</button>
              </div>
              <textarea
                id="article-content-editor"
                className="w-full bg-white border border-slate-200 p-5 rounded-xl resize-none font-serif leading-relaxed focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all text-lg"
                rows={14}
                placeholder="Write your article content here... (Markdown support coming soon)"
                value={content}
                onChange={e => setContent(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Tags (Optional)</label>
              <input 
                className="w-full bg-white border border-slate-200 p-3.5 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all" 
                placeholder="e.g. AI, NLP, Machine Learning (comma separated)" 
                value={tags} 
                onChange={e => setTags(e.target.value)} 
              />
            </div>
            
            <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 border border-amber-200 rounded-xl p-4 flex gap-4 items-start shadow-sm">
              <Bot className="w-6 h-6 text-amber-500 mt-0.5" />
              <div>
                <h4 className="font-bold text-amber-900 text-sm mb-1">AI Content Screening</h4>
                <p className="text-sm text-amber-800 font-medium leading-relaxed">
                  All submissions are automatically screened by our AI moderation system to prevent spam, plagiarism, and inappropriate content. High-quality original research is prioritized.
                </p>
              </div>
            </div>
            
            <div className="pt-4">
              <button 
                type="submit" 
                disabled={publishing} 
                className="w-full sm:w-auto bg-primary-600 text-white px-10 py-4 rounded-xl font-bold shadow-md hover:shadow-lg hover:bg-primary-700 disabled:opacity-50 transition-all flex justify-center items-center gap-2"
              >
                {publishing ? (
                  <><svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Analyzing & Publishing...</>
                ) : (
                  <>Submit Article <Send className="w-5 h-5" /></>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* My Articles */}
      {view === 'mine' && (
        <div className="space-y-4 animate-slide-up">
          {myArticles.length === 0 ? (
            <div className="text-center py-20 glass-panel rounded-[2rem] border border-white/60">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 border border-slate-200">
                <FileText className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-lg font-bold text-slate-700 mb-2">You haven't written any articles yet.</p>
              {canPublish && <button onClick={() => setView('write')} className="text-primary-600 font-semibold hover:underline">Start writing →</button>}
            </div>
          ) : (
            <div className="grid gap-4">
              {myArticles.map((a, idx) => (
                <div 
                  key={a.id} 
                  className="glass-panel rounded-2xl p-5 sm:p-6 hover:shadow-md transition-all border border-white/60 flex flex-col sm:flex-row sm:items-center justify-between gap-5 group"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl shadow-sm border border-indigo-100 group-hover:scale-110 transition-transform flex-shrink-0">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-lg text-slate-900 group-hover:text-primary-600 transition-colors truncate cursor-pointer" onClick={() => setSelected(a)}>{a.title}</h3>
                      <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-2">
                        <span className="truncate">{a.category}</span>
                        <span className="opacity-50">•</span>
                        <span>{a.createdAt ? new Date(a.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 pl-16 sm:pl-0 border-t sm:border-t-0 border-slate-100 pt-4 sm:pt-0 shrink-0">
                    <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border shadow-sm flex items-center gap-1.5 ${
                      a.status === 'published' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                      a.status === 'flagged' ? 'bg-red-100 text-red-700 border-red-200' :
                      a.status === 'rejected' ? 'bg-red-100 text-red-700 border-red-200' :
                      'bg-amber-100 text-amber-700 border-amber-200'
                    }`}>
                      {a.status === 'published' ? <><CheckCircle2 className="w-3.5 h-3.5" /> Published</> : 
                       a.status === 'flagged' ? <><Flag className="w-3.5 h-3.5" /> Flagged</> : 
                       a.status === 'rejected' ? <><XCircle className="w-3.5 h-3.5" /> Rejected</> : 
                       <><Clock className="w-3.5 h-3.5" /> Pending Review</>}
                    </span>
                    <button 
                      onClick={() => deleteArticle(a.id)} 
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 border border-slate-200 hover:border-red-200 transition-colors"
                      title="Delete Article"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
