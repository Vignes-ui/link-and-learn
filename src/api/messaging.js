import { apiFetch, poll } from './http';

export const getConversationId = (uid1, uid2) => {
  // Keep old helper for UI state keys; backend uses numeric conversation rows
  return [String(uid1), String(uid2)].sort().join('_');
};

export const sendMessage = async (_senderIdIgnored, receiverId, text) => {
  return apiFetch(`/api/conversations/${receiverId}/messages`, { method: 'POST', body: { text } });
};

export const subscribeMessages = (_senderIdIgnored, receiverId, callback) => {
  return poll(async () => {
    const { messages } = await apiFetch(`/api/conversations/${receiverId}/messages`);
    callback(messages || []);
  }, 1000);
};

export const subscribeConversations = (_uidIgnored, callback) => {
  return poll(async () => {
    const { conversations } = await apiFetch('/api/conversations');
    callback(conversations || []);
  }, 1500);
};

export const searchUsers = async (searchTerm) => {
  const { users } = await apiFetch(`/api/users/search?q=${encodeURIComponent(searchTerm)}`);
  return (users || []).map(u => ({ id: String(u.id), ...u }));
};

