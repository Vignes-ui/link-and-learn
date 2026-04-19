import { apiFetch, poll } from './http';

export const getNotifications = async () => {
  return apiFetch('/api/notifications');
};

export const markAsRead = async (id) => {
  return apiFetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
};

export const markAllAsRead = async () => {
  return apiFetch('/api/notifications/read-all', { method: 'POST' });
};

export const subscribeNotifications = (callback) => {
  return poll(async () => {
    const data = await getNotifications();
    callback(data.notifications || []);
  }, 5000);
};
