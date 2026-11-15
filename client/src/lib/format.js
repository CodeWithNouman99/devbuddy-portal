// Small display helpers shared by several pages.

export const ROLE_LABELS = { admin: 'Admin', hr: 'HR', manager: 'Manager' };

export const DEV_ROLES = ['Frontend', 'Backend', 'Full Stack', 'QA', 'DevOps'];

// Join dates are stored as midnight UTC, so format in UTC to avoid showing
// the previous day in time zones behind UTC.
export function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

// For real timestamps (assignedAt, askedAt): shown in the viewer's own time zone.
export function formatDateTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function formatWhatsapp(number) {
  return number ? `+${number}` : '';
}

// "Fatima Noor" -> "FN"
export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] || '?').slice(0, 2);
  return letters.toUpperCase();
}

// "2026-11-14" for <input type="date"> (local date, not UTC)
export function todayInputValue() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
