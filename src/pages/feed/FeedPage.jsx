import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { createPost, subscribeFeed, toggleLike, addComment, deletePost } from '../../api/posts';

export default function FeedPage() {
  const { currentUser, userData } = useAuth();
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [posting, setPosting] = useState(false);
  const [commentText, setCommentText] = useState({});
  const [openComments, setOpenComments] = useState({});

  useEffect(() => {
    const unsub = subscribeFeed(setPosts);
    return () => unsub();
  }, []);

  const handlePost = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setPosting(true);
    try {
      await createPost(currentUser.uid, userData, content, imageFile);
      setContent('');
      setImageFile(null);
    } finally {
      setPosting(false);
    }
  };

  const timeAgo = (ts) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const secs = Math.floor((Date.now() - d) / 1000);
    if (secs < 60) return 'just now';
    if (secs < 3600) return Math.floor(secs / 60) + 'm ago';
    if (secs < 86400) return Math.floor(secs / 3600) + 'h ago';
    return Math.floor(secs / 86400) + 'd ago';
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Create post box */}
      <div className="bg-white rounded-2xl shadow p-5">
        <form onSubmit={handlePost}>
          <div className="flex gap-3">
            <img
              src={userData?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData?.name || 'U')}&background=3b82f6&color=fff`}
              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              alt=""
            />
            <textarea
              className="flex-1 border border-gray-200 rounded-xl p-3 resize-none text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Share something with the community..."
              value={content}
              onChange={e => setContent(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <label className="flex items-center gap-2 cursor-pointer text-gray-500 hover:text-blue-600 text-sm">
              <input type="file" accept="image/*" className="hidden" onChange={e => setImageFile(e.target.files[0])} />
              <span>📷 {imageFile ? imageFile.name.slice(0, 20) + '...' : 'Add Photo'}</span>
            </label>
            <button
              type="submit"
              disabled={posting || !content.trim()}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {posting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>
      </div>

      {posts.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📝</p>
          <p className="font-medium">No posts yet. Be the first to share something!</p>
        </div>
      )}

      {posts.map(post => {
        const liked = post.likes?.includes(currentUser.uid);
        return (
          <div key={post.id} className="bg-white rounded-2xl shadow p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(post.authorName || 'U')}&background=3b82f6&color=fff`}
                  className="w-10 h-10 rounded-full flex-shrink-0"
                  alt=""
                />
                <div>
                  <p className="font-semibold text-sm">{post.authorName}</p>
                  <p className="text-xs text-gray-400 capitalize">{post.authorRole?.replace('_', ' ')} · {timeAgo(post.createdAt)}</p>
                </div>
              </div>
              {post.uid === currentUser.uid && (
                <button onClick={() => deletePost(post.id)} className="text-gray-300 hover:text-red-500 text-sm" title="Delete">🗑</button>
              )}
            </div>

            <p className="text-sm text-gray-800 whitespace-pre-wrap">{post.content}</p>
            {post.imageUrl && <img src={post.imageUrl} className="rounded-xl w-full object-cover max-h-80" alt="post" />}

            <div className="flex gap-4 pt-2 border-t border-gray-100 text-sm text-gray-500">
              <button
                onClick={() => toggleLike(post.id)}
                className={`flex items-center gap-1 hover:text-blue-600 transition-colors ${liked ? 'text-blue-600 font-semibold' : ''}`}
              >
                👍 {post.likes?.length || 0} Like{post.likes?.length !== 1 ? 's' : ''}
              </button>
              <button
                onClick={() => setOpenComments(p => ({ ...p, [post.id]: !p[post.id] }))}
                className="flex items-center gap-1 hover:text-blue-600"
              >
                💬 {post.comments?.length || 0} Comments
              </button>
            </div>

            {openComments[post.id] && (
              <div className="space-y-2 pt-1">
                {(post.comments || []).map((c, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-700">{c.authorName}</p>
                    <p className="text-sm text-gray-600 mt-0.5">{c.text}</p>
                  </div>
                ))}
                <div className="flex gap-2 mt-2">
                  <input
                    className="flex-1 border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                    placeholder="Write a comment..."
                    value={commentText[post.id] || ''}
                    onChange={e => setCommentText(p => ({ ...p, [post.id]: e.target.value }))}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        addComment(post.id, currentUser.uid, userData.name, commentText[post.id]);
                        setCommentText(p => ({ ...p, [post.id]: '' }));
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      addComment(post.id, currentUser.uid, userData.name, commentText[post.id]);
                      setCommentText(p => ({ ...p, [post.id]: '' }));
                    }}
                    className="bg-blue-600 text-white px-3 rounded-lg text-sm hover:bg-blue-700"
                  >
                    Send
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
