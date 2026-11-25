import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReport } from '../js/report.js';

const city = {
  place: 'Testville',
  hours: [60, 120, 30, 35, 200].map((aqi, i) => ({ time: `t${i}`, label: `h${i}`, aqi })),
};

test('report combines current reading, advice, window and series', () => {
  const r = buildReport(city, { personaId: 'general', activityId: 'rest', durationHours: 2 });
  assert.equal(r.place, 'Testville');
  assert.equal(r.currentAqi, 60);
  assert.equal(r.category.name, 'Moderate');
  assert.equal(r.advice.level.id, 'go');
  assert.deepEqual(r.window, { startLabel: 'h2', averageAqi: 33 });
  assert.equal(r.series.length, 5);
});

test('report reflects persona and activity choices', () => {
  const relaxed = buildReport(city, { personaId: 'general', activityId: 'rest', durationHours: 1 });
  const strict = buildReport(city, { personaId: 'respiratory', activityId: 'exercise', durationHours: 1 });
  assert.equal(relaxed.advice.level.id, 'go');
  assert.equal(strict.advice.level.id, 'care');
});

test('report has no window when the requested duration is too long', () => {
  assert.equal(buildReport(city, { personaId: 'general', activityId: 'rest', durationHours: 9 }).window, null);
});

test('report rejects invalid choices', () => {
  assert.throws(() => buildReport(city, { personaId: 'x', activityId: 'rest', durationHours: 1 }), RangeError);
});
