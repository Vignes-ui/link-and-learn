import { apiFetch } from './http';

export const signup = async (email, password, role = 'student', name = '') => {
  return apiFetch('/api/auth/signup', { method: 'POST', body: { email, password, role, name } });
};

export const login = async (email, password) => {
  return apiFetch('/api/auth/login', { method: 'POST', body: { email, password } });
};

export const logoutUser = async () => {
  return apiFetch('/api/auth/logout', { method: 'POST' });
};

export const getMe = async () => {
  return apiFetch('/api/auth/me');
};

// Firebase-only feature removed for PHP migration
export const loginWithGoogle = async () => {
  throw new Error('Google login is not available in PHP/SQL mode.');
};

