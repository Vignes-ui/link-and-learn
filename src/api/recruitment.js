import { apiFetch, poll } from './http';

export const createVacancy = async (_uidIgnored, _userDataIgnored, vacancy) => {
  return apiFetch('/api/vacancies', { method: 'POST', body: vacancy });
};

export const subscribeVacancies = (callback) => {
  return poll(async () => {
    const { vacancies } = await apiFetch('/api/vacancies?status=open');
    callback(vacancies || []);
  }, 5000);
};

export const applyForVacancy = async (vacancyId) => {
  return apiFetch(`/api/vacancies/${vacancyId}/apply`, { method: 'POST' });
};

export const getMyVacancies = async () => {
  const { vacancies } = await apiFetch('/api/vacancies/mine');
  return vacancies || [];
};

export const updateApplicantStatus = async (vacancyId, applicantUid, status) => {
  return apiFetch(`/api/vacancies/${vacancyId}/applicants/${applicantUid}/status`, { method: 'PATCH', body: { status } });
};

