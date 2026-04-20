import { apiFetch, poll } from './http';

export const createAd = async (ad) => {
  return apiFetch('/api/ads', { method: 'POST', body: ad });
};

export const getMyAds = async () => {
  const { ads } = await apiFetch('/api/ads/mine');
  return ads || [];
};

export const getPendingAds = async () => {
  const { ads } = await apiFetch('/api/admin/ads?status=pending');
  return ads || [];
};

export const updateAdStatus = async (adId, status, reason = '') => {
  return apiFetch(`/api/admin/ads/${adId}/status`, { method: 'PATCH', body: { status, reason } });
};

export const subscribeAds = (callback) => {
  return poll(async () => {
    const { ads } = await apiFetch('/api/ads?status=approved&placement=feed');
    callback(ads || []);
  }, 10000);
};

export const getApprovedAds = async (placement = '') => {
  const query = placement ? `&placement=${encodeURIComponent(placement)}` : '';
  const { ads } = await apiFetch(`/api/ads?status=approved${query}`);
  return ads || [];
};

export const recordAdImpression = async (adId) => {
  return apiFetch(`/api/ads/${adId}/impression`, { method: 'POST' });
};

export const recordAdClick = async (adId) => {
  return apiFetch(`/api/ads/${adId}/click`, { method: 'POST' });
};
