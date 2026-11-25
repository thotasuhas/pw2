/** Open-Meteo access: geocode a city, load hourly PM2.5/PM10, convert to AQI readings. */
import { computeAqi } from './aqi.js';
import { NotFoundError, ServiceError } from './errors.js';
import { requestJson } from './http.js';
import { currentHourIndex, formatHourLabel } from './time.js';
import { cleanQuery } from './validation.js';

export const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
export const AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
export const DEFAULT_TIMEOUT_MS = 8000;
export const HOURS_SHOWN = 24;

/**
 * @typedef {{time: string, label: string, aqi: number}} HourReading
 * @typedef {{place: string, hours: HourReading[]}} CityReport
 * @typedef {{fetchFn?: typeof fetch, timeoutMs?: number, nowMs?: number, signal?: AbortSignal}} FetchOptions
 * @typedef {(query: string, options?: FetchOptions) => Promise<CityReport>} CityFetcher
 * @typedef {{time: string[], pm25: Array<number | null>, pm10: Array<number | null>, utcOffsetSeconds: number}} Hourly
 */

/**
 * @param {string} query already cleaned
 * @param {import('./http.js').RequestContext} context
 */
async function geocode(query, context) {
  const params = new URLSearchParams({ name: query, count: '1', language: 'en', format: 'json' });
  const place = (await requestJson(`${GEOCODING_URL}?${params}`, context))?.results?.[0];
  if (!place) throw new NotFoundError(`No place found for "${query}".`);
  return place;
}

/**
 * @param {{latitude: number, longitude: number}} place
 * @param {import('./http.js').RequestContext} context
 * @returns {Promise<Hourly>}
 */
async function loadHourly({ latitude, longitude }, context) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    hourly: 'pm2_5,pm10',
    forecast_days: '2',
    timezone: 'auto',
  });
  const body = await requestJson(`${AIR_QUALITY_URL}?${params}`, context);
  const { time, pm2_5: pm25, pm10 } = body?.hourly ?? {};
  const wellFormed =
    [time, pm25, pm10].every(Array.isArray) && time.length === pm25.length && time.length === pm10.length;
  if (!wellFormed) throw new ServiceError('Unexpected response from the air quality service.');
  return { time, pm25, pm10, utcOffsetSeconds: Number(body.utc_offset_seconds) || 0 };
}

/**
 * Up to HOURS_SHOWN readings from `start`; hours without PM2.5 are skipped, PM10 is optional.
 * @param {Hourly} hourly
 * @param {number} start
 * @returns {HourReading[]}
 */
function toReadings({ time, pm25, pm10 }, start) {
  const readings = [];
  for (let i = start; i < time.length && readings.length < HOURS_SHOWN; i += 1) {
    const fine = pm25[i];
    if (typeof fine !== 'number') continue;
    const coarse = pm10[i];
    readings.push({
      time: time[i],
      label: formatHourLabel(time[i]),
      aqi: computeAqi(fine, typeof coarse === 'number' ? coarse : null),
    });
  }
  return readings;
}

/**
 * @param {string} rawQuery
 * @param {FetchOptions} [options]
 * @returns {Promise<CityReport>} hourly readings starting at the city's current local hour
 * @throws {import('./errors.js').AppError}
 */
export async function fetchCity(rawQuery, options = {}) {
  const {
    fetchFn = globalThis.fetch.bind(globalThis),
    timeoutMs = DEFAULT_TIMEOUT_MS,
    nowMs = Date.now(),
    signal,
  } = options;
  const context = { fetchFn, timeoutMs, signal };
  const place = await geocode(cleanQuery(rawQuery), context);
  const hourly = await loadHourly(place, context);
  const hours = toReadings(hourly, currentHourIndex(hourly.time, hourly.utcOffsetSeconds, nowMs));
  if (hours.length === 0) throw new NotFoundError('No air quality data is available for this place.');
  return { place: [place.name, place.country].filter(Boolean).join(', '), hours };
}
