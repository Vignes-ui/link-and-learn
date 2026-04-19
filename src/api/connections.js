import { apiFetch } from './http';

export const getConnections = async () => {
  return apiFetch('/api/connections');
};

export const requestConnection = async (userId) => {
  return apiFetch('/api/connections/request', { method: 'POST', body: { userId } });
};

export const respondConnection = async (userId, status) => {
  return apiFetch('/api/connections/respond', { method: 'PATCH', body: { userId, status } });
};

export const getConnectionStatus = async (userId) => {
  return apiFetch(`/api/connections/status/${userId}`);
};
