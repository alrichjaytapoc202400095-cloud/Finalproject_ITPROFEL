// Display formatters. Money is ALWAYS an integer number of centavos from the API.
export function pesos(cents) {
  const value = Number(cents || 0) / 100;
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function initials(title = '') {
  const words = String(title).trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'SP';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

export function cx(...values) {
  return values.filter(Boolean).join(' ');
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// Stable, deterministic accent per product so fallback covers look intentional
// (and are identical between renders / offline cache).
export function coverAccent(seed = '') {
  let hash = 0;
  for (let i = 0; i < String(seed).length; i += 1) {
    hash = (hash * 31 + String(seed).charCodeAt(i)) % 360;
  }
  return hash;
}
