// Data layer for make.fun's public API (read-only GET, CORS open).
//
// Two kinds of reuse keep repeat views cheap:
//  - ETag revalidation: the API binds its ETags to the minute, so a repeat
//    fetch sends If-None-Match and a 304 costs no body at all. Answers are
//    kept in a small in-memory map keyed by path.
//  - Request dedup: while one fetch for a path is in flight, every other
//    caller shares that same promise instead of starting a second request.

const API_BASE = 'https://make.fun/api';

const cache = new Map(); // path -> { etag, data }
const inflight = new Map(); // path -> Promise<data>

export function apiGet(path) {
  const pending = inflight.get(path);
  if (pending) return pending;
  const hit = cache.get(path);
  const headers = hit && hit.etag ? { 'If-None-Match': hit.etag } : {};
  const request = (async () => {
    try {
      const res = await fetch(API_BASE + path, { headers });
      if (res.status === 304 && hit) return hit.data;
      if (!res.ok) throw new Error(`make.fun API ${res.status} for ${path}`);
      const data = await res.json();
      cache.set(path, { etag: res.headers.get('etag'), data });
      return data;
    } finally {
      inflight.delete(path);
    }
  })();
  inflight.set(path, request);
  return request;
}

/** The bounty board list: open competitions, activity trimmed to times. */
export const fetchBoard = () => apiGet('/competitions?status=open&activity=times');

/** One competition in full, by slug. */
export const fetchBounty = (slug) => apiGet(`/competitions/${encodeURIComponent(slug)}`);

/** A competition's leaderboard: columns, phase and ranked entries. */
export const fetchLeaderboard = (slug) => apiGet(`/competitions/${encodeURIComponent(slug)}/leaderboard`);

/** A public profile by handle. */
export const fetchProfile = (handle) => apiGet(`/profiles/${encodeURIComponent(handle)}`);

/** Absolute URL for an API-relative asset path (avatars, entry images). */
export const assetUrl = (path) => (path ? `https://make.fun${path}` : '');
