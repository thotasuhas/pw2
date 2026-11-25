import test from 'node:test';
import assert from 'node:assert/strict';
import { ServiceError } from '../js/errors.js';
import { requestJson } from '../js/http.js';

const hang = (_url, { signal }) =>
  new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason)));

test('returns parsed JSON for successful responses', async () => {
  const fetchFn = async () => ({ ok: true, status: 200, json: async () => ({ a: 1 }) });
  assert.deepEqual(await requestJson('https://x.test', { fetchFn, timeoutMs: 100 }), { a: 1 });
});

test('maps HTTP errors, network errors and bad JSON to ServiceError', async () => {
  const cases = [
    async () => ({ ok: false, status: 503, json: async () => ({}) }),
    async () => {
      throw new TypeError('offline');
    },
    async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('bad json');
      },
    }),
  ];
  for (const fetchFn of cases) {
    await assert.rejects(requestJson('https://x.test', { fetchFn, timeoutMs: 100 }), ServiceError);
  }
});

test('times out with a ServiceError', async () => {
  await assert.rejects(
    requestJson('https://x.test', { fetchFn: hang, timeoutMs: 10 }),
    (e) => e instanceof ServiceError && /timed out/.test(e.message),
  );
});

test('forwards caller aborts and cleans up listeners', async () => {
  const controller = new AbortController();
  const pending = requestJson('https://x.test', {
    fetchFn: hang,
    timeoutMs: 5000,
    signal: controller.signal,
  });
  controller.abort(new DOMException('cancelled', 'AbortError'));
  await assert.rejects(pending, (e) => e.name === 'AbortError');
});
