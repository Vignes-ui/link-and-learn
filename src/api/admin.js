import { apiFetch } from './http';

export const getAdminOverview = async () => {
  return apiFetch('/api/admin/overview');
};

export const getAdminUsers = async () => {
  const { users } = await apiFetch('/api/admin/users');
  return users || [];
};

export const updateAdminUserStatus = async (uid, status) => {
  return apiFetch(`/api/admin/users/${uid}/account-status`, {
    method: 'PATCH',
    body: { status },
  });
};

export const updateAdminCertificateStatus = async (uid, certIndex, status) => {
  return apiFetch(`/api/admin/users/${uid}/certificates/${certIndex}`, {
    method: 'PATCH',
    body: { status },
  });
};
