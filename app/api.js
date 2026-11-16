// make.fun's public API: read-only GET requests, open to any origin (CORS).
// The full API is described at https://make.fun/api/openapi.json.
//
// One small client for the whole app: every read goes through a shared cache
// keyed by path, so a view that re-renders (or a hash change back to a page
// already seen) costs no second request. Each entry keeps its ETag; within a
// minute the API answers 304 and the cached body is reused as-is.

const API = 'https://make.fun/api';
const TTL_MS = 60_000;

/** path -> { at, etag, data } */
const cache = new Map();

async function get(path) {
  const hit = cache.get(path);
  const fresh = hit && Date.now() - hit.at < TTL_MS;
  if (fresh) return hit.data;
  const headers = {};
  if (hit?.etag) headers['If-None-Match'] = hit.etag;
  const res = await fetch(API + path, { headers });
  if (res.status === 304 && hit) {
    hit.at = Date.now();
    return hit.data;
  }
  if (!res.ok) throw new Error(`make.fun API ${res.status} on ${path}`);
  const data = await res.json();
  cache.set(path, { at: Date.now(), etag: res.headers.get('etag') ?? null, data });
  return data;
}

/** The open bounties: { items: [...] } (activity=times leaves out the activity a board does not show). */
export const getBounties = () => get('/competitions?status=open&activity=times');

/** One bounty, by its slug. */
export const getBounty = (slug) => get(`/competitions/${encodeURIComponent(slug)}`);

/** One bounty's leaderboard: { competition, phase, columns, entries: [...] }. */
export const getLeaderboard = (slug) => get(`/competitions/${encodeURIComponent(slug)}/leaderboard`);

/** One account's public profile: { handle, display_name, record, solutions: [...] }. */
export const getProfile = (handle) => get(`/profiles/${encodeURIComponent(handle)}`);

/** How many requests the app has made this session (for the footer note). */
export const requestCount = () => cache.size;
