import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { publishArticle, subscribeArticles, getMyArticles, deleteArticle } from '../../api/articles';

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

  const canPublish = ['researcher', 'govt_body', 'admin'].includes(userData?.role);

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
      setMsg('✅ Article submitted for review. It will be published after AI content check.');
      setTitle(''); setContent(''); setTags('');
    } catch {
      setMsg('❌ Failed to publish');
    } finally {
      setPublishing(false);
    }
  };

  if (selected) {
    return (
      <div className="max-w-3xl mx-auto">
        <button onClick={() => setSelected(null)} className="text-blue-600 text-sm mb-4 hover:underline">← Back to articles</button>
        <div className="bg-white rounded-2xl shadow p-8">
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{selected.category}</span>
          <h1 className="text-2xl font-bold text-gray-900 mt-3 mb-1">{selected.title}</h1>
          <p className="text-sm text-gray-500 mb-6">By {selected.authorName} · {selected.createdAt ? new Date(selected.createdAt).toLocaleDateString() : 'N/A'}</p>
          <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">{selected.content}</div>
          {selected.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-gray-100">
              {selected.tags.map(t => <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">#{t}</span>)}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">📚 Journals & Articles</h1>
        <div className="flex gap-2">
          <button onClick={() => setView('browse')} className={`px-4 py-2 rounded-lg text-sm font-medium ${view === 'browse' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}>Browse</button>
          {canPublish && <button onClick={() => setView('write')} className={`px-4 py-2 rounded-lg text-sm font-medium ${view === 'write' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}>✍️ Write</button>}
          <button onClick={() => setView('mine')} className={`px-4 py-2 rounded-lg text-sm font-medium ${view === 'mine' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}>My Articles</button>
        </div>
      </div>

      {/* Browse */}
      {view === 'browse' && (
        <div className="grid gap-4">
          {articles.length === 0 && (
            <div className="text-center py-16 text-gray-400 bg-white rounded-2xl">
              <p className="text-4xl mb-3">📄</p>
              <p>No articles published yet.</p>
            </div>
          )}
          {articles.map(article => (
            <div key={article.id} className="bg-white rounded-2xl shadow p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelected(article)}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{article.category}</span>
                  <h2 className="text-lg font-bold text-gray-900 mt-2">{article.title}</h2>
                  <p className="text-sm text-gray-500 mt-1">By {article.authorName} · {article.createdAt ? new Date(article.createdAt).toLocaleDateString() : ''}</p>
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">{article.content.slice(0, 180)}...</p>
                  {article.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {article.tags.slice(0, 4).map(t => <span key={t} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">#{t}</span>)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Write */}
      {view === 'write' && canPublish && (
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-lg font-bold mb-4">Write New Article</h2>
          {msg && <div className="bg-blue-50 text-blue-700 rounded-lg p-3 text-sm mb-4">{msg}</div>}
          <form onSubmit={handlePublish} className="space-y-4">
            <input className="w-full border border-gray-300 p-3 rounded-lg" placeholder="Article Title" value={title} onChange={e => setTitle(e.target.value)} required />
            <select className="w-full border border-gray-300 p-3 rounded-lg" value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <textarea
              className="w-full border border-gray-300 p-3 rounded-lg resize-none"
              rows={12}
              placeholder="Write your article content here... (supports plain text)"
              value={content}
              onChange={e => setContent(e.target.value)}
              required
            />
            <input className="w-full border border-gray-300 p-3 rounded-lg" placeholder="Tags (comma separated, e.g. AI, NLP, Research)" value={tags} onChange={e => setTags(e.target.value)} />
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
              ⚠️ All articles are automatically screened for AI-generated content before publication.
            </div>
            <button type="submit" disabled={publishing} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
              {publishing ? 'Submitting...' : 'Submit Article'}
            </button>
          </form>
        </div>
      )}

      {/* My Articles */}
      {view === 'mine' && (
        <div className="space-y-3">
          {myArticles.length === 0 && <div className="text-center py-12 text-gray-400 bg-white rounded-2xl">No articles yet.</div>}
          {myArticles.map(a => (
            <div key={a.id} className="bg-white rounded-2xl shadow p-5 flex items-center justify-between">
              <div>
                <p className="font-semibold">{a.title}</p>
                <p className="text-sm text-gray-500">{a.category} · {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ''}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  a.status === 'published' ? 'bg-green-100 text-green-700' :
                  a.status === 'flagged' ? 'bg-red-100 text-red-700' :
                  a.status === 'rejected' ? 'bg-red-100 text-red-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {a.status === 'published' ? '✅ Published' : a.status === 'flagged' ? '🚩 Flagged' : a.status === 'rejected' ? '❌ Rejected' : '⏳ Pending'}
                </span>
                <button onClick={() => deleteArticle(a.id)} className="text-gray-300 hover:text-red-500 text-sm">🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
