import test from 'node:test';
import assert from 'node:assert/strict';
import { createCachedFetcher } from '../js/cache.js';
import { ValidationError } from '../js/errors.js';

test('cached fetcher reuses results within the TTL and refreshes after it', async () => {
  let clock = 0;
  let calls = 0;
  const fetcher = async () => ({ place: 'X', hours: [], n: ++calls });
  const cached = createCachedFetcher(fetcher, { ttlMs: 1000, now: () => clock });
  assert.equal((await cached('Delhi')).n, 1);
  assert.equal((await cached('  delhi ')).n, 1); // same key after normalisation
  clock = 999;
  assert.equal((await cached('Delhi')).n, 1);
  clock = 1001;
  assert.equal((await cached('Delhi')).n, 2);
  assert.equal((await cached('Mumbai')).n, 3);
  await assert.rejects(cached('<bad>'), ValidationError);
});

test('failures are not cached', async () => {
  let calls = 0;
  const flaky = async () => {
    calls += 1;
    if (calls === 1) throw new Error('boom');
    return { place: 'X', hours: [] };
  };
  const cached = createCachedFetcher(flaky);
  await assert.rejects(cached('Delhi'), /boom/);
  assert.equal((await cached('Delhi')).place, 'X');
});
