const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const getToken = () => localStorage.getItem('token');
export const saveSession = (token, user) => {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
};
export const clearSession = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};
export const getUser = () => {
  try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
};

// Throws Error(message) with err.status on non-2xx so callers can show it.
export async function api(path, { method = 'GET', body } = {}) {
  const token = getToken();
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw Object.assign(new Error('Cannot reach the server. Is the API running?'), { status: 0 });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Something went wrong'), { status: res.status });
  return data;
}

// Local YYYY-MM-DD (not UTC) so "today" matches the student's clock.
export const toDateStr = (d = new Date()) => d.toLocaleDateString('en-CA');
// "TODAY", "TOMORROW" or "SUN, NOV 8" for a YYYY-MM-DD string.
export const dayLabel = (s) => {
  const today = toDateStr();
  const t = new Date(); t.setDate(t.getDate() + 1);
  if (s === today) return 'TODAY';
  if (s === toDateStr(t)) return 'TOMORROW';
  return new Date(s + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase().replace(' ', ', ');
};
export const fmtHour = (h) => {
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:00 ${suffix}`;
};
