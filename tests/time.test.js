import test from 'node:test';
import assert from 'node:assert/strict';
import { currentHourIndex, formatHourLabel } from '../js/time.js';

const TIMES = Array.from(
  { length: 48 },
  (_, i) => `2026-11-${i < 24 ? '25' : '26'}T${String(i % 24).padStart(2, '0')}:00`,
);
// 2026-11-25 14:30 in IST (UTC+5:30) is 09:00 UTC
const NOW_MS = Date.UTC(2026, 10, 25, 9, 0);

test('formatHourLabel formats ISO local times and tolerates junk', () => {
  assert.equal(formatHourLabel('2026-11-25T14:00'), '25 Nov, 14:00');
  assert.equal(formatHourLabel('2026-01-05T00:00'), '5 Jan, 00:00');
  assert.equal(formatHourLabel('nonsense'), 'nonsense');
});

test("currentHourIndex uses the city's local time, not the browser's", () => {
  assert.equal(currentHourIndex(TIMES, 19800, NOW_MS), 14);
  assert.equal(currentHourIndex(TIMES, 0, NOW_MS), 9);
  assert.equal(currentHourIndex(TIMES, 0, Date.UTC(2030, 0, 1)), 0); // not listed -> start
});
