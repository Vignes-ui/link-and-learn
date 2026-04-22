import { BASE, apiFetch } from './http';

export const signup = async (email, password, role = 'student', name = '') => {
  return apiFetch('/api/auth/signup', { method: 'POST', body: { email, password, role, name } });
};

export const login = async (email, password) => {
  return apiFetch('/api/auth/login', { method: 'POST', body: { email, password } });
};

export const forgotPassword = async (email) => {
  return apiFetch('/api/auth/forgot-password', { method: 'POST', body: { email } });
};

export const resetPassword = async (token, password) => {
  return apiFetch('/api/auth/reset-password', { method: 'POST', body: { token, password } });
};

export const logoutUser = async () => {
  return apiFetch('/api/auth/logout', { method: 'POST' });
};

export const getMe = async () => {
  return apiFetch('/api/auth/me');
};

export const oauthStartUrl = (provider) => {
  return `${BASE}/api/auth/oauth/${provider}/start`;
};

export const completeOAuthRole = async (role, name = '') => {
  return apiFetch('/api/auth/oauth/role', { method: 'POST', body: { role, name } });
};

