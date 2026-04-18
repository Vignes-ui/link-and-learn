export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

async function parseJsonSafe(res) {
  const text = await res.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

export async function apiFetch(path, { method = 'GET', headers, body } = {}) {
  const res = await fetch(path, {
    method,
    headers: {
      ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(headers || {}),
    },
    body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined),
    credentials: 'include',
  });

  const payload = await parseJsonSafe(res);
  if (!res.ok) {
    const msg = payload?.error || payload?.message || `Request failed (${res.status})`;
    throw new ApiError(msg, res.status, payload);
  }
  return payload;
}

export function poll(fn, intervalMs = 4000) {
  let cancelled = false;
  let timer = null;

  const tick = async () => {
    if (cancelled) return;
    try { await fn(); } finally {
      if (!cancelled) timer = setTimeout(tick, intervalMs);
    }
  };

  tick();
  return () => {
    cancelled = true;
    if (timer) clearTimeout(timer);
  };
}

