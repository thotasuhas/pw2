import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CATEGORIES,
  MAX_AQI,
  PM10_BREAKPOINTS,
  PM25_BREAKPOINTS,
  aqiCategory,
  computeAqi,
  subIndex,
} from '../js/aqi.js';

test('every PM2.5 breakpoint edge maps to its AQI edge', () => {
  for (const [cLow, cHigh, iLow, iHigh] of PM25_BREAKPOINTS) {
    assert.equal(subIndex(cLow, PM25_BREAKPOINTS, 1), iLow, `low edge ${cLow}`);
    assert.equal(subIndex(cHigh, PM25_BREAKPOINTS, 1), iHigh, `high edge ${cHigh}`);
  }
});

test('every PM10 breakpoint edge maps to its AQI edge', () => {
  for (const [cLow, cHigh, iLow, iHigh] of PM10_BREAKPOINTS) {
    assert.equal(subIndex(cLow, PM10_BREAKPOINTS, 0), iLow);
    assert.equal(subIndex(cHigh, PM10_BREAKPOINTS, 0), iHigh);
  }
});

test('concentrations are truncated, not rounded (EPA rule)', () => {
  assert.equal(computeAqi(9.09), 50); // truncates to 9.0
  assert.equal(computeAqi(35.49), 100); // truncates to 35.4
  assert.equal(computeAqi(5, 54.9), 50); // PM10 truncates to 54
});

test('values above the scale are capped at 500', () => {
  assert.equal(computeAqi(10_000), MAX_AQI);
  assert.equal(computeAqi(1, 10_000), MAX_AQI);
});

test('overall AQI is the maximum sub-index', () => {
  assert.equal(computeAqi(5, 300), subIndex(300, PM10_BREAKPOINTS, 0));
  assert.equal(computeAqi(60, 10), subIndex(60, PM25_BREAKPOINTS, 1));
  assert.equal(computeAqi(20, null), computeAqi(20));
  assert.equal(computeAqi(20, undefined), computeAqi(20));
});

test('AQI never decreases as concentration increases', () => {
  let previous = -1;
  for (let c = 0; c <= 400; c += 0.1) {
    const value = computeAqi(c);
    assert.ok(value >= previous, `drop at ${c}`);
    previous = value;
  }
});

test('invalid concentrations are rejected', () => {
  for (const bad of [-1, Number.NaN, Infinity, '12', null, undefined, {}]) {
    assert.throws(() => computeAqi(bad), RangeError);
  }
  assert.throws(() => computeAqi(5, -3), RangeError);
});

test('category boundaries', () => {
  const expected = [
    [0, 'Good'],
    [50, 'Good'],
    [51, 'Moderate'],
    [100, 'Moderate'],
    [101, 'Unhealthy for Sensitive Groups'],
    [150, 'Unhealthy for Sensitive Groups'],
    [151, 'Unhealthy'],
    [200, 'Unhealthy'],
    [201, 'Very Unhealthy'],
    [300, 'Very Unhealthy'],
    [301, 'Hazardous'],
    [500, 'Hazardous'],
    [999, 'Hazardous'],
  ];
  for (const [aqi, name] of expected) assert.equal(aqiCategory(aqi).name, name, `aqi ${aqi}`);
  assert.equal(new Set(CATEGORIES.map((c) => c.id)).size, CATEGORIES.length);
});
