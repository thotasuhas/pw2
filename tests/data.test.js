import test from 'node:test';
import assert from 'node:assert/strict';
import { AIR_QUALITY_URL, GEOCODING_URL, fetchCity } from '../js/data.js';
import { NotFoundError, ServiceError, ValidationError } from '../js/errors.js';

const json = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });
const GEO = { results: [{ name: 'Hyderabad', country: 'India', latitude: 17.38, longitude: 78.47 }] };

function airBody(count = 48, overrides = {}) {
  const time = Array.from(
    { length: count },
    (_, i) => `2026-11-${i < 24 ? '25' : '26'}T${String(i % 24).padStart(2, '0')}:00`,
  );
  return {
    utc_offset_seconds: 19800,
    hourly: { time, pm2_5: time.map(() => 20), pm10: time.map(() => 40) },
    ...overrides,
  };
}
/** Fake fetch that routes by URL and records calls. */
function fakeFetch(air = airBody(), geo = GEO) {
  const calls = [];
  const fn = async (url) => {
    calls.push(String(url));
    return String(url).startsWith(GEOCODING_URL) ? json(geo) : json(air);
  };
  fn.calls = calls;
  return fn;
}
// 2026-11-25 14:30 in IST (UTC+5:30) == 09:00 UTC
const NOW_MS = Date.UTC(2026, 10, 25, 9, 0);

test('fetchCity returns 24 readings starting at the current local hour', async () => {
  const city = await fetchCity('Hyderabad', { fetchFn: fakeFetch(), nowMs: NOW_MS });
  assert.equal(city.place, 'Hyderabad, India');
  assert.equal(city.hours.length, 24);
  assert.equal(city.hours[0].time, '2026-11-25T14:00');
  assert.equal(city.hours[0].label, '25 Nov, 14:00');
  assert.equal(city.hours[0].aqi, 71); // pm2.5=20 -> 71 (PM10=40 -> 37)
});

test('fetchCity encodes the query and never leaks it into the path', async () => {
  const fetchFn = fakeFetch();
  await fetchCity("St. John's", { fetchFn, nowMs: NOW_MS });
  assert.match(fetchFn.calls[0], /name=St\.\+John%27s/);
  assert.ok(fetchFn.calls[1].startsWith(AIR_QUALITY_URL));
  assert.match(fetchFn.calls[1], /latitude=17\.38/);
});

test('fetchCity skips gaps and tolerates a missing PM10', async () => {
  const air = airBody();
  air.hourly.pm2_5[14] = null;
  air.hourly.pm10[15] = null;
  const city = await fetchCity('Hyderabad', { fetchFn: fakeFetch(air), nowMs: NOW_MS });
  assert.equal(city.hours[0].time, '2026-11-25T15:00');
  assert.equal(city.hours[0].aqi, 71);
});

test('fetchCity raises NotFoundError for unknown places and empty data', async () => {
  await assert.rejects(fetchCity('Nowhere', { fetchFn: fakeFetch(airBody(), {}) }), NotFoundError);
  const empty = airBody();
  empty.hourly.pm2_5 = empty.hourly.pm2_5.map(() => null);
  await assert.rejects(fetchCity('Hyderabad', { fetchFn: fakeFetch(empty), nowMs: NOW_MS }), NotFoundError);
});

test('fetchCity raises ServiceError for HTTP errors, bad shapes and network failure', async () => {
  const http500 = async () => json({}, 500);
  await assert.rejects(fetchCity('Hyderabad', { fetchFn: http500 }), ServiceError);
  const badShape = airBody();
  badShape.hourly.pm10 = badShape.hourly.pm10.slice(1);
  await assert.rejects(fetchCity('Hyderabad', { fetchFn: fakeFetch(badShape) }), ServiceError);
  await assert.rejects(fetchCity('Hyderabad', { fetchFn: fakeFetch({ nothing: true }) }), ServiceError);
  const offline = async () => {
    throw new TypeError('network down');
  };
  await assert.rejects(fetchCity('Hyderabad', { fetchFn: offline }), ServiceError);
});

test('fetchCity validates input before any network call', async () => {
  const fetchFn = fakeFetch();
  await assert.rejects(fetchCity('<b>', { fetchFn }), ValidationError);
  assert.equal(fetchFn.calls.length, 0);
});

test('fetchCity times out slow services', async () => {
  const hang = (_url, { signal }) =>
    new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason)));
  await assert.rejects(
    fetchCity('Hyderabad', { fetchFn: hang, timeoutMs: 20 }),
    (e) => e instanceof ServiceError && /timed out/.test(e.message),
  );
});

test('fetchCity honours an external abort signal', async () => {
  const hang = (_url, { signal }) =>
    new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason)));
  const controller = new AbortController();
  const pending = fetchCity('Hyderabad', { fetchFn: hang, signal: controller.signal, timeoutMs: 5000 });
  controller.abort(new DOMException('cancelled', 'AbortError'));
  await assert.rejects(pending, (e) => e.name === 'AbortError');
});
