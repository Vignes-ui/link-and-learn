import { apiFetch, poll } from './http';

export const createEvent = async (_uidIgnored, _userDataIgnored, event) => {
  return apiFetch('/api/events', { method: 'POST', body: event });
};

export const updateEvent = async (eventId, event) => {
  return apiFetch(`/api/events/${eventId}`, { method: 'PATCH', body: event });
};

export const deleteEvent = async (eventId) => {
  return apiFetch(`/api/events/${eventId}`, { method: 'DELETE' });
};

export const subscribeEvents = (callback) => {
  return poll(async () => {
    const { events } = await apiFetch('/api/events');
    callback(events || []);
  }, 5000);
};

export const registerForEvent = async (eventId, _attendeeIgnored) => {
  const { ticketId } = await apiFetch(`/api/events/${eventId}/register`, { method: 'POST' });
  return ticketId;
};

export const getMyEvents = async () => {
  const { events } = await apiFetch('/api/events/mine');
  return events || [];
};

export const getMyRegistrations = async () => {
  const { events } = await apiFetch('/api/events/registrations/mine');
  return events || [];
};

export const markAttendance = async (eventId, attendeeUid) => {
  return apiFetch(`/api/events/${eventId}/attendance/${attendeeUid}`, { method: 'PATCH' });
};

