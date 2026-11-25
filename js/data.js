/**
 * Data layer: input validation, Open-Meteo requests (geocoding + hourly PM),
 * response validation and a small TTL cache. `fetch` and the clock are injectable
 * so everything is testable offline.
 */
import { computeAqi } from './aqi.js';

export const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
export const AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
export const DEFAULT_TIMEOUT_MS = 8000;
export const CACHE_TTL_MS = 15 * 60 * 1000;
export const HOURS_SHOWN = 24;

export class ValidationError extends Error {}
export class NotFoundError extends Error {}
export class ServiceError extends Error {}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** @param {string} raw @returns {string} */
export function cleanQuery(raw) {
  const query = String(raw ?? '').trim().replace(/\s+/g, ' ');
  if (query.length < 2 || query.length > 80 || !/^[\p{L}\p{M}\p{N} .,'-]+$/u.test(query)) {
    throw new ValidationError("Enter a city name (2-80 letters, numbers, spaces or . , ' -).");
  }
  return query;
}

/** "2026-11-25T14:00" -> "25 Nov, 14:00" */
export function formatHourLabel(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]}, ${m[4]}:${m[5]}`;
}

/**
 * Index of the current local hour in the API's local-time list.
 * @param {string[]} times ISO local times, e.g. "2026-11-25T14:00"
 * @param {number} utcOffsetSeconds city's UTC offset
 * @param {number} nowMs epoch milliseconds
 * @returns {number} index (0 if the current hour is not in the list)
 */
export function currentHourIndex(times, utcOffsetSeconds, nowMs) {
  const local = new Date(nowMs + utcOffsetSeconds * 1000).toISOString().slice(0, 13) + ':00';
  const index = times.indexOf(local);
  return index === -1 ? 0 : index;
}

async function requestJson(url, { fetchFn, timeoutMs, signal }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new ServiceError('The air quality service timed out.')), timeoutMs);
  const onAbort = () => controller.abort(signal.reason);
  signal?.addEventListener('abort', onAbort, { once: true });
  try {
    const response = await fetchFn(url, { signal: controller.signal });
    if (!response.ok) throw new ServiceError(`Air quality service error (${response.status}).`);
    return await response.json();
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    if (controller.signal.aborted) throw controller.signal.reason ?? error;
    throw new ServiceError('Could not reach the air quality service.');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

/**
 * @typedef {{time: string, label: string, aqi: number}} HourReading
 * @typedef {{place: string, hours: HourReading[]}} CityReport
 */

/**
 * @param {string} rawQuery
 * @param {{fetchFn?: typeof fetch, timeoutMs?: number, nowMs?: number, signal?: AbortSignal}} [options]
 * @returns {Promise<CityReport>} up to 24 hourly readings starting at the current hour
 */
export async function fetchCity(rawQuery, options = {}) {
  const { fetchFn = globalThis.fetch.bind(globalThis), timeoutMs = DEFAULT_TIMEOUT_MS, nowMs = Date.now(), signal } = options;
  const ctx = { fetchFn, timeoutMs, signal };
  const query = cleanQuery(rawQuery);

  const geo = await requestJson(`${GEOCODING_URL}?${new URLSearchParams({ name: query, count: '1', language: 'en', format: 'json' })}`, ctx);
  const place = geo?.results?.[0];
  if (!place) throw new NotFoundError(`No place found for "${query}".`);

  const params = new URLSearchParams({
    latitude: String(place.latitude), longitude: String(place.longitude),
    hourly: 'pm2_5,pm10', forecast_days: '2', timezone: 'auto',
  });
  const air = await requestJson(`${AIR_QUALITY_URL}?${params}`, ctx);
  const { time, pm2_5: pm25, pm10 } = air?.hourly ?? {};
  if (![time, pm25, pm10].every(Array.isArray) || time.length !== pm25.length || time.length !== pm10.length) {
    throw new ServiceError('Unexpected response from the air quality service.');
  }

  const start = currentHourIndex(time, Number(air.utc_offset_seconds) || 0, nowMs);
  const hours = [];
  for (let i = start; i < time.length && hours.length < HOURS_SHOWN; i += 1) {
    if (typeof pm25[i] !== 'number') continue; // gaps in the model output are skipped
    hours.push({ time: time[i], label: formatHourLabel(time[i]), aqi: computeAqi(pm25[i], typeof pm10[i] === 'number' ? pm10[i] : null) });
  }
  if (hours.length === 0) throw new NotFoundError('No air quality data is available for this place.');
  return { place: [place.name, place.country].filter(Boolean).join(', '), hours };
}

/**
 * Wraps a fetcher with a per-query TTL cache (identical lookups within 15 min are free).
 * @param {typeof fetchCity} fetcher
 * @param {{ttlMs?: number, now?: () => number}} [options]
 */
export function createCachedFetcher(fetcher = fetchCity, { ttlMs = CACHE_TTL_MS, now = Date.now } = {}) {
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
