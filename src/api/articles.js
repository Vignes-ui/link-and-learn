import { apiFetch, poll } from './http';

export const publishArticle = async (_uidIgnored, _userDataIgnored, article) => {
  return apiFetch('/api/articles', { method: 'POST', body: article });
};

export const subscribeArticles = (callback) => {
  return poll(async () => {
    const { articles } = await apiFetch('/api/articles?status=published');
    callback(articles || []);
  }, 5000);
};

export const getMyArticles = async () => {
  const { articles } = await apiFetch('/api/articles/mine');
  return articles || [];
};

export const deleteArticle = async (articleId) => {
  return apiFetch(`/api/articles/${articleId}`, { method: 'DELETE' });
};

export const updateArticleStatus = async (articleId, status, reason = '') => {
  return apiFetch(`/api/admin/articles/${articleId}/status`, { method: 'PATCH', body: { status, reason } });
};

