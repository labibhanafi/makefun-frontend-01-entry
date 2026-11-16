// Formatting helpers shared by every view. Every string that arrives from the
// API passes through esc() before it is placed in HTML — no exceptions.

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escape a value for safe insertion into HTML text or attribute context. */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}

/** USD amounts: whole dollars without cents, fractions with two ('$1,325', '$0.50'). */
export function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/** An ISO timestamp as a UTC date and time, e.g. '17 Nov 2026, 12:30 UTC'. */
export function fullDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const day = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
  return `${day}, ${time} UTC`;
}

/** Split the span to an ISO deadline into countdown parts (null once passed). */
export function countdownParts(iso, now = Date.now()) {
  const ms = new Date(iso).getTime() - now;
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const totalMinutes = Math.floor(ms / 60000);
  return {
    days: Math.floor(totalMinutes / 1440),
    hours: Math.floor((totalMinutes % 1440) / 60),
    minutes: totalMinutes % 60,
    seconds: Math.floor((ms % 60000) / 1000),
  };
}

/** '2d 4h left', '3h 12m left', '41m 05s left', or 'closed'. */
export function timeLeft(iso, now = Date.now()) {
  const p = countdownParts(iso, now);
  if (!p) return 'closed';
  if (p.days > 0) return `${p.days}d ${p.hours}h left`;
  if (p.hours > 0) return `${p.hours}h ${p.minutes}m left`;
  return `${p.minutes}m ${String(p.seconds).padStart(2, '0')}s left`;
}

/** A bounty takes entries only while its deadline is still ahead — the API can
 *  keep saying status "open" after the deadline until results are published. */
export const isOpen = (bounty, now = Date.now()) =>
  bounty.status === 'open' && countdownParts(bounty.deadline, now) !== null;

/** A micro-unit rate (win_rate_micro and friends) as a percentage: 950587 -> '95.1%'. */
export function microPct(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `${(n / 10000).toFixed(1)}%`;
}

/** '1 entry' / '212 entries'. */
export const entryCount = (n) => `${Number(n) || 0} ${Number(n) === 1 ? 'entry' : 'entries'}`;
