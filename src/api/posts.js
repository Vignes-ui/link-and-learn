import { apiFetch, poll } from './http';

export const createPost = async (_uidIgnored, _userDataIgnored, content, imageFile = null) => {
  const fd = new FormData();
  fd.append('content', content);
  if (imageFile) fd.append('image', imageFile);
  return apiFetch('/api/posts', { method: 'POST', body: fd });
};

export const subscribeFeed = (callback) => {
  return poll(async () => {
    const { posts } = await apiFetch('/api/posts?limit=50');
    const fetchedAt = Date.now();
    callback((posts || []).map(post => ({ ...post, fetchedAt })));
  }, 4000);
};

export const toggleLike = async (postId) => {
  return apiFetch(`/api/posts/${postId}/like`, { method: 'POST' });
};

export const addComment = async (postId, _uidIgnored, _authorNameIgnored, text, parentId = null) => {
  return apiFetch(`/api/posts/${postId}/comments`, {
    method: 'POST',
    body: parentId ? { text, parentId } : { text },
  });
};

export const deletePost = async (postId) => {
  return apiFetch(`/api/posts/${postId}`, { method: 'DELETE' });
};

