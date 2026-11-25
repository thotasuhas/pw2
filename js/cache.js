import { cleanQuery } from './validation.js';

export const CACHE_TTL_MS = 15 * 60 * 1000;

/**
 * Wraps a city fetcher with a per-query TTL cache. Failures are never cached.
 * @param {import('./data.js').CityFetcher} fetcher
 * @param {{ttlMs?: number, now?: () => number}} [options] injectable clock for tests
 * @returns {import('./data.js').CityFetcher}
 */
export function createCachedFetcher(fetcher, { ttlMs = CACHE_TTL_MS, now = Date.now } = {}) {
  /** @type {Map<string, {at: number, value: import('./data.js').CityReport}>} */
  const cache = new Map();
  return async (rawQuery, options) => {
    const key = cleanQuery(rawQuery).toLowerCase();
    const hit = cache.get(key);
    if (hit && now() - hit.at < ttlMs) return hit.value;
    const value = await fetcher(rawQuery, options);
    cache.set(key, { at: now(), value });
    return value;
  };
}
