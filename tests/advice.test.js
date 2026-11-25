import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTIVITIES, PERSONAS, advise, bestWindow, effectiveAqi } from '../js/advice.js';

const hour = (label, aqi) => ({ label, aqi });

test('thresholds are inclusive at the exact boundary', () => {
  assert.equal(advise(99, 'general', 'rest').level.id, 'go');
  assert.equal(advise(100, 'general', 'rest').level.id, 'care');
  assert.equal(advise(199, 'general', 'rest').level.id, 'care');
  assert.equal(advise(200, 'general', 'rest').level.id, 'avoid');
});

test('more sensitive personas are warned earlier', () => {
  assert.equal(advise(90, 'general', 'rest').level.id, 'go');
  assert.equal(advise(90, 'vulnerable', 'rest').level.id, 'care');
  assert.equal(advise(60, 'respiratory', 'rest').level.id, 'care');
  assert.equal(advise(130, 'respiratory', 'rest').level.id, 'avoid');
});

test('exertion raises the effective AQI and can change the verdict', () => {
  assert.equal(effectiveAqi(100, 'exercise'), 140);
  assert.equal(advise(80, 'general', 'rest').level.id, 'go');
  assert.equal(advise(80, 'general', 'exercise').level.id, 'care');
});

test('severity never decreases as AQI rises, for every persona and activity', () => {
  for (const persona of Object.keys(PERSONAS)) {
    for (const activity of Object.keys(ACTIVITIES)) {
      let previous = 0;
      for (let aqi = 0; aqi <= 500; aqi += 1) {
        const { rank } = advise(aqi, persona, activity).level;
        assert.ok(rank >= previous, `${persona}/${activity} dropped at ${aqi}`);
        previous = rank;
      }
    }
  }
});

test('harmful air always includes mask and medical guidance', () => {
  const { actions } = advise(300, 'general', 'exercise');
  assert.ok(actions.some((a) => a.includes('N95')));
  assert.ok(actions.some((a) => a.toLowerCase().includes('medical')));
});

test('good air gives a short all-clear', () => {
  const advice = advise(10, 'respiratory', 'rest');
  assert.equal(advice.level.label, 'Go');
  assert.ok(advice.actions.length >= 1);
});

test('unknown persona or activity is rejected', () => {
  assert.throws(() => advise(50, 'nobody', 'rest'), /Unknown persona/);
  assert.throws(() => advise(50, 'general', 'flying'), /Unknown activity/);
  assert.throws(() => effectiveAqi(50, 'flying'), RangeError);
});

test('persona and activity tables are well-formed', () => {
  for (const p of Object.values(PERSONAS)) assert.ok(p.caution < p.avoid && p.label);
  for (const a of Object.values(ACTIVITIES)) assert.ok(a.factor >= 1 && a.label);
});

test('bestWindow finds the cleanest contiguous block', () => {
  const hours = [hour('a', 100), hour('b', 40), hour('c', 50), hour('d', 120)];
  assert.deepEqual(bestWindow(hours, 1), { startLabel: 'b', averageAqi: 40 });
  assert.deepEqual(bestWindow(hours, 2), { startLabel: 'b', averageAqi: 45 });
  assert.deepEqual(bestWindow(hours, 4), { startLabel: 'a', averageAqi: 78 });
});

test('bestWindow ties go to the earliest start', () => {
  assert.equal(bestWindow([hour('a', 50), hour('b', 50)], 1).startLabel, 'a');
});

test('bestWindow rejects impossible requests', () => {
  assert.equal(bestWindow([hour('a', 1)], 2), null);
  assert.equal(bestWindow([], 1), null);
  assert.equal(bestWindow([hour('a', 1)], 0), null);
  assert.equal(bestWindow([hour('a', 1)], 1.5), null);
});
