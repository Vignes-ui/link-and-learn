export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

// In development: Vite proxies /api → XAMPP (localhost:8080)
// In production:  VITE_API_BASE = your live PHP host (e.g. https://yoursite.infinityfree.com)
export const BASE = import.meta.env.VITE_API_BASE || '';

async function parseJsonSafe(res) {
  const text = await res.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

export async function apiFetch(path, { method = 'GET', headers, body } = {}) {
  const res = await fetch(BASE + path, {
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
    const detail = typeof payload?.detail === 'string' ? payload.detail.trim() : '';
    const baseMsg = payload?.error || payload?.message || `Request failed (${res.status})`;
    const msg = detail && detail !== baseMsg ? `${baseMsg}: ${detail}` : baseMsg;
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

