import { apiFetch } from './http';

export const updateProfile = async (_uidIgnored, profileData) => {
  // Backend derives user from session
  const { user } = await apiFetch('/api/users/me', { method: 'PATCH', body: profileData });
  return user;
};

export const uploadAvatar = async (_uidIgnored, file) => {
  const fd = new FormData();
  fd.append('file', file);
  const { url } = await apiFetch('/api/uploads/avatar', { method: 'POST', body: fd });
  return url;
};

export const uploadCertificate = async (_uidIgnored, file, degree) => {
  const fd = new FormData();
  fd.append('degree', degree);
  fd.append('file', file);
  const { url } = await apiFetch('/api/uploads/certificate', { method: 'POST', body: fd });
  return url;
};

export const getUserById = async (id) => {
  const { user } = await apiFetch(`/api/users/${id}`);
  return user ? { id: String(user.id), ...user } : null;
};

export const getAllUsers = async () => {
  const { users } = await apiFetch('/api/admin/users');
  return users;
};

export const updateAccountStatus = async (uid, status) => {
  await apiFetch(`/api/admin/users/${uid}/account-status`, { method: 'PATCH', body: { status } });
};

export const updateCertificateStatus = async (uid, certIndex, status) => {
  await apiFetch(`/api/admin/users/${uid}/certificates/${certIndex}`, { method: 'PATCH', body: { status } });
};

