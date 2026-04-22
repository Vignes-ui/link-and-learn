import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { createPost, subscribeFeed, toggleLike, addComment, deletePost } from '../../api/posts';
import { getConnections, requestConnection } from '../../api/connections';
import { subscribeAds, recordAdImpression, recordAdClick } from '../../api/ads';
import { Send, FileText, UserPlus, Clock as ClockIcon } from 'lucide-react';

export default function FeedPage() {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [ads, setAds] = useState([]);
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [posting, setPosting] = useState(false);
  const [commentText, setCommentText] = useState({});
  const [replyTarget, setReplyTarget] = useState({});
  const [openComments, setOpenComments] = useState({});
  const [myConnections, setMyConnections] = useState([]);
  const [now, setNow] = useState(Date.now());
  const seenAdIds = useRef(new Set());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const unsub = subscribeFeed(setPosts);
    const unsubAds = subscribeAds(setAds);
    fetchConnections();
    return () => { unsub(); unsubAds(); };
  }, []);

  useEffect(() => {
    ads.forEach((ad) => {
      if (!seenAdIds.current.has(ad.id)) {
        seenAdIds.current.add(ad.id);
        recordAdImpression(ad.id).catch(() => {});
      }
    });
  }, [ads]);

  const fetchConnections = async () => {
    try {
      const { connections } = await getConnections();
      setMyConnections(connections);
    } catch (err) {
      console.error(err);
    }
  };

  const handleConnect = async (userId) => {
    try {
      await requestConnection(userId);
      setMyConnections(prev => {
        const id = String(userId);
        if (prev.some(c => c.id === id)) {
          return prev.map(c => c.id === id ? { ...c, status: 'sent_pending' } : c);
        }
        return [...prev, { id, status: 'sent_pending' }];
      });
      fetchConnections();
    } catch (err) {
      alert(err?.message || 'Failed to connect');
    }
  };

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

  const handleLike = async (postId) => {
    // Optimistic update
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const isLiked = p.likes?.includes(currentUser.uid);
        const newLikes = isLiked 
          ? p.likes.filter(id => id !== currentUser.uid)
          : [...(p.likes || []), currentUser.uid];
        return { ...p, likes: newLikes };
      }
      return p;
    }));
    
    try {
      await toggleLike(postId);
    } catch (err) {
      console.error(err);
    }
  };

  const getAuthorId = (post) => {
    const rawId = post.authorId ?? post.user_id ?? post.uid;
    return rawId ? String(rawId) : '';
  };

  const timeAgo = (ts, ageSeconds, fetchedAt) => {
    let secs;
    if (Number.isFinite(ageSeconds) && fetchedAt) {
      secs = Math.floor(ageSeconds + ((now - fetchedAt) / 1000));
    } else {
      if (!ts) return '';
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      secs = Math.floor((now - d) / 1000);
    }
    secs = Math.max(0, secs);
    if (secs < 60) return 'just now';
    if (secs < 3600) return Math.floor(secs / 60) + 'm ago';
    if (secs < 86400) return Math.floor(secs / 3600) + 'h ago';
    return Math.floor(secs / 86400) + 'd ago';
  };

  const handleCommentSubmit = async (postId) => {
    const text = (commentText[postId] || '').trim();
    if (!text) return;
    const parentId = replyTarget[postId]?.id || null;
    try {
      await addComment(postId, currentUser.uid, userData.name, text, parentId);
      setCommentText(p => ({ ...p, [postId]: '' }));
      setReplyTarget(p => {
        const next = { ...p };
        delete next[postId];
        return next;
      });
    } catch (err) {
      alert(err?.message || 'Failed to post comment');
    }
  };

  const startReply = (postId, comment) => {
    if (!comment?.id) return;
    setReplyTarget(p => ({ ...p, [postId]: comment }));
    setOpenComments(p => ({ ...p, [postId]: true }));
  };

  const clearReply = (postId) => {
    setReplyTarget(p => {
      const next = { ...p };
      delete next[postId];
      return next;
    });
  };

  const renderCommentThread = (comment, allComments, postId, depth = 0) => {
    const commentId = comment.id ? String(comment.id) : '';
    const replies = commentId
      ? allComments.filter(item => item.parentId && String(item.parentId) === commentId)
      : [];
    const indent = depth > 0 ? Math.min(depth, 3) * 18 : 0;

    return (
      <div key={commentId || `${comment.uid}-${comment.createdAt}-${depth}`} className="space-y-2" style={{ marginLeft: indent }}>
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-3.5 flex gap-3">
          <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(comment.authorName || 'User')}&background=e2e8f0&color=475569&size=32`} className="w-8 h-8 rounded-full flex-shrink-0" alt="" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="text-xs font-bold text-slate-900">{comment.authorName}</p>
              {comment.createdAt && <span className="text-[11px] font-medium text-slate-400">{timeAgo(comment.createdAt)}</span>}
            </div>
            <p className="text-sm text-slate-700 mt-1 leading-snug break-words">{comment.text}</p>
            {commentId && (
              <button
                type="button"
                onClick={() => startReply(postId, comment)}
                className="mt-2 text-xs font-bold text-primary-600 hover:text-primary-700"
              >
                Reply
              </button>
            )}
          </div>
        </div>
        {replies.length > 0 && (
          <div className="space-y-2 border-l-2 border-slate-200 pl-3">
            {replies.map(reply => renderCommentThread(reply, allComments, postId, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Create post box */}
      <div className="glass-panel rounded-[2rem] shadow-sm p-6 sm:p-8 border border-white/60 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-100 rounded-full blur-[60px] opacity-60 -z-10" />
        
        <form onSubmit={handlePost}>
          <div className="flex gap-4">
            <img
              src={userData?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData?.name || 'U')}&background=3b82f6&color=fff`}
              className="w-12 h-12 rounded-full object-cover flex-shrink-0 shadow-sm border-2 border-white"
              alt=""
            />
            <div className="flex-1">
              <textarea
                className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl p-4 resize-none text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all shadow-sm"
                rows={3}
                placeholder="Share your research, thoughts, or updates with the community..."
                value={content}
                onChange={e => setContent(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 pl-16">
            <label className="flex items-center gap-2 cursor-pointer text-slate-500 hover:text-primary-600 font-medium transition-colors bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 hover:border-primary-200 shadow-sm">
              <input type="file" accept="image/*" className="hidden" onChange={e => setImageFile(e.target.files[0])} />
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              <span>{imageFile ? imageFile.name.slice(0, 20) + '...' : 'Attach Image'}</span>
            </label>
            <button
              type="submit"
              disabled={posting || !content.trim()}
              className="bg-primary-600 text-white px-8 py-2.5 rounded-xl font-bold shadow-md hover:bg-primary-700 hover:shadow-lg disabled:opacity-50 disabled:shadow-none transition-all flex items-center gap-2"
            >
              {posting ? (
                <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Posting</>
              ) : (
                <>Post <Send className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Feed Area */}
      <div className="space-y-6 relative">
        {ads.slice(0, 1).map((ad) => {
          return (
            <button
              key={ad.id}
              onClick={() => {
                recordAdClick(ad.id).catch(() => {});
                if (ad.destinationUrl) window.open(ad.destinationUrl, '_blank', 'noopener,noreferrer');
              }}
              className="w-full text-left glass-panel rounded-[2rem] shadow-sm p-6 border border-amber-200/70 bg-gradient-to-r from-amber-50 to-white hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between gap-4 mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest bg-amber-200 text-amber-900 px-2.5 py-1 rounded-full">
                  Sponsored
                </span>
                <span className="text-xs font-semibold text-slate-500">{ad.advertiserName}</span>
              </div>
              <h3 className="text-xl font-display font-bold text-slate-900 mb-2">{ad.title}</h3>
              <p className="text-slate-600 leading-relaxed">{ad.description}</p>
            </button>
          );
        })}

        {posts.length === 0 && (
          <div className="text-center py-20 px-6 glass-panel rounded-[2rem] border border-white/60">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 border border-slate-200 shadow-inner">
              <FileText className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-display font-bold text-slate-900 mb-2">No posts yet</h3>
            <p className="text-slate-500 font-medium">Be the first to share something with the network!</p>
          </div>
        )}

        {posts.map((post, idx) => {
          const liked = post.likes?.includes(currentUser.uid);
          const authorId = getAuthorId(post);
          const isOwnPost = authorId === currentUser.uid;
          const connection = myConnections.find(c => c.id === authorId);
          const comments = post.comments || [];
          const rootComments = comments.filter(comment => !comment.parentId);
          const activeReply = replyTarget[post.id];
          return (
            <div key={post.id} className="glass-panel rounded-[2rem] shadow-sm p-6 sm:p-8 border border-white/60 hover:shadow-md transition-shadow animate-slide-up" style={{ animationDelay: `${idx * 100}ms` }}>
              {/* Post Header */}
              <div className="flex items-start justify-between mb-4">
                <div 
                  className="flex items-center gap-4 group cursor-pointer"
                  onClick={() => authorId && navigate(`/profile/${authorId}`)}
                >
                  <img
                    src={post.authorAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.authorName || 'U')}&background=3b82f6&color=fff&size=56`}
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover flex-shrink-0 shadow-sm border border-slate-100 group-hover:ring-2 ring-primary-500 transition-all"
                    alt=""
                  />
                  <div>
                    <p className="font-bold text-slate-900 text-lg group-hover:text-primary-600 transition-colors">{post.authorName}</p>
                    <p className="text-xs sm:text-sm font-medium text-slate-500 capitalize">
                      {post.authorRole?.replace('_', ' ')} <span className="mx-1.5 opacity-50">•</span> {timeAgo(post.createdAt, post.ageSeconds, post.fetchedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!isOwnPost && authorId && (
                    <div className="mr-2">
                      {connection?.status === 'accepted' ? (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">Connected</span>
                      ) : connection?.status === 'sent_pending' ? (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-100 flex items-center gap-1"><ClockIcon className="w-3 h-3" /> Pending</span>
                      ) : (
                        <button 
                          onClick={() => handleConnect(authorId)}
                          className="flex items-center gap-1.5 bg-primary-50 text-primary-600 hover:bg-primary-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-primary-100 shadow-sm"
                        >
                          <UserPlus className="w-3.5 h-3.5" /> Connect
                        </button>
                      )}
                    </div>
                  )}
                  {isOwnPost ? (
                    <button onClick={() => deletePost(post.id)} className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete Post">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Post Content */}
              <div className="pl-0 sm:pl-[72px]">
                  <div className="flex-1 min-w-0">
                    <h3 
                      onClick={() => authorId && navigate(`/profile/${authorId}`)}
                      className="text-base sm:text-lg font-bold text-slate-900 leading-tight hover:text-primary-600 cursor-pointer transition-colors"
                    >
                      {post.authorName}
                    </h3>
                  </div>
                <p className="text-[15px] sm:text-base text-slate-700 whitespace-pre-wrap leading-relaxed mb-4">
                  {post.content}
                </p>
                {post.imageUrl && (
                  <div className="mb-4 rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 shadow-sm">
                    <img src={post.imageUrl} className="w-full object-cover max-h-[400px] hover:scale-[1.02] transition-transform duration-500" alt="post attachment" />
                  </div>
                )}

                {/* Interactions */}
                <div className="flex gap-6 pt-4 border-t border-slate-100 mt-2">
                  <button
                    onClick={() => handleLike(post.id)}
                    className={`flex items-center gap-2 text-sm font-semibold transition-all hover:scale-105 ${liked ? 'text-primary-600' : 'text-slate-500 hover:text-primary-500'}`}
                  >
                    <svg className={`w-5 h-5 ${liked ? 'fill-current' : 'fill-none'}`} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.514"></path></svg>
                    {post.likes?.length || 0} Like{post.likes?.length !== 1 ? 's' : ''}
                  </button>
                  <button
                    onClick={() => setOpenComments(p => ({ ...p, [post.id]: !p[post.id] }))}
                    className={`flex items-center gap-2 text-sm font-semibold transition-all hover:scale-105 ${openComments[post.id] ? 'text-primary-600' : 'text-slate-500 hover:text-primary-500'}`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                    {post.comments?.length || 0} Comments
                  </button>
                </div>

                {/* Comments Section */}
                {openComments[post.id] && (
                  <div className="mt-5 space-y-4 animate-fade-in bg-slate-50/50 p-4 sm:p-5 rounded-2xl border border-slate-100">
                    <div className="space-y-3">
                      {rootComments.map(comment => renderCommentThread(comment, comments, post.id))}
                      {comments.length === 0 && (
                        <p className="text-center text-slate-400 text-sm font-medium py-2">No comments yet. Be the first!</p>
                      )}
                    </div>
                    {activeReply && (
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-primary-100 bg-primary-50 px-3 py-2 text-xs font-semibold text-primary-700">
                        <span className="truncate">Replying to {activeReply.authorName}</span>
                        <button type="button" onClick={() => clearReply(post.id)} className="text-primary-700 hover:text-primary-900">
                          Cancel
                        </button>
                      </div>
                    )}
                    <div className="flex gap-3 pt-2">
                      <img src={userData?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData?.name || 'U')}&background=3b82f6&color=fff&size=36`} className="w-9 h-9 rounded-full object-cover flex-shrink-0 border border-slate-200" alt="" />
                      <div className="flex-1 flex bg-white border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent transition-shadow shadow-sm">
                        <input
                          className="flex-1 bg-transparent p-2.5 px-4 text-sm outline-none text-slate-800 placeholder-slate-400"
                          placeholder={activeReply ? `Reply to ${activeReply.authorName}...` : 'Write a comment...'}
                          value={commentText[post.id] || ''}
                          onChange={e => setCommentText(p => ({ ...p, [post.id]: e.target.value }))}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && commentText[post.id]?.trim()) {
                              e.preventDefault();
                              handleCommentSubmit(post.id);
                            }
                          }}
                        />
                        <button
                          disabled={!commentText[post.id]?.trim()}
                          onClick={() => handleCommentSubmit(post.id)}
                          className="px-4 font-semibold text-primary-600 hover:bg-primary-50 disabled:opacity-50 transition-colors"
                        >
                          {activeReply ? 'Reply' : 'Post'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
