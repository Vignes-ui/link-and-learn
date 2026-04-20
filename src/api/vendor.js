import { apiFetch, poll } from './http';

export const postRequirement = async (_uidIgnored, _userDataIgnored, requirement) => {
  return apiFetch('/api/requirements', { method: 'POST', body: requirement });
};

export const subscribeRequirements = (callback) => {
  return poll(async () => {
    const { requirements } = await apiFetch('/api/requirements?status=open');
    callback(requirements || []);
  }, 5000);
};

export const submitQuote = async (requirementId, vendor) => {
  // vendor object in UI contains price/timeline/terms + uid/name; server uses session user
  return apiFetch(`/api/requirements/${requirementId}/quotes`, { method: 'POST', body: { price: vendor.price, timeline: vendor.timeline, terms: vendor.terms } });
};

export const getMyRequirements = async () => {
  const { requirements } = await apiFetch('/api/requirements/mine');
  return requirements || [];
};

export const getVendors = async () => {
  const { vendors } = await apiFetch('/api/vendors');
  return vendors || [];
};

export const upsertVendorCatalogue = async (_uidIgnored, catalogue) => {
  const { user } = await apiFetch('/api/users/me/catalogue', { method: 'PATCH', body: { catalogue } });
  return user;
};

export const awardQuote = async (requirementId, vendorUid) => {
  return apiFetch(`/api/requirements/${requirementId}/award`, { method: 'POST', body: { vendorUid } });
};

