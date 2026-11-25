/**
 * AQI calculation using the US EPA 2024 breakpoints for PM2.5 and PM10.
 * Pure functions only: no DOM, no network.
 */

/** @typedef {readonly [number, number, number, number]} Breakpoint  [concLow, concHigh, aqiLow, aqiHigh] */

/** @type {readonly Breakpoint[]} PM2.5 in ug/m3, truncated to 0.1 */
export const PM25_BREAKPOINTS = Object.freeze([
  [0, 9.0, 0, 50], [9.1, 35.4, 51, 100], [35.5, 55.4, 101, 150],
  [55.5, 125.4, 151, 200], [125.5, 225.4, 201, 300], [225.5, 325.4, 301, 500],
]);

/** @type {readonly Breakpoint[]} PM10 in ug/m3, truncated to an integer */
export const PM10_BREAKPOINTS = Object.freeze([
  [0, 54, 0, 50], [55, 154, 51, 100], [155, 254, 101, 150],
  [255, 354, 151, 200], [355, 424, 201, 300], [425, 604, 301, 500],
]);

export const MAX_AQI = 500;

export const CATEGORIES = Object.freeze([
  { max: 50, id: 'good', name: 'Good' },
  { max: 100, id: 'moderate', name: 'Moderate' },
  { max: 150, id: 'usg', name: 'Unhealthy for Sensitive Groups' },
  { max: 200, id: 'unhealthy', name: 'Unhealthy' },
  { max: 300, id: 'very-unhealthy', name: 'Very Unhealthy' },
  { max: MAX_AQI, id: 'hazardous', name: 'Hazardous' },
]);

/**
 * Sub-index for one pollutant by linear interpolation inside its band.
 * @param {number} concentration non-negative, finite
 * @param {readonly Breakpoint[]} breakpoints
 * @param {number} decimals decimals kept when truncating (EPA rule)
 * @returns {number} integer AQI, capped at MAX_AQI
 */
export function subIndex(concentration, breakpoints, decimals) {
  if (typeof concentration !== 'number' || !Number.isFinite(concentration) || concentration < 0) {
    throw new RangeError('Concentration must be a finite, non-negative number.');
  }
  const scale = 10 ** decimals;
  const c = Math.floor(concentration * scale + 1e-9) / scale;
  const top = breakpoints[breakpoints.length - 1];
  if (c > top[1]) return MAX_AQI;
  const [cLow, cHigh, iLow, iHigh] = breakpoints.find((b) => c <= b[1]);
  return Math.round(((iHigh - iLow) / (cHigh - cLow)) * (Math.max(c, cLow) - cLow) + iLow);
}

/**
 * Overall AQI is the highest pollutant sub-index.
 * @param {number} pm25
 * @param {number | null | undefined} [pm10]
 */
export function computeAqi(pm25, pm10) {
  const values = [subIndex(pm25, PM25_BREAKPOINTS, 1)];
  if (pm10 !== null && pm10 !== undefined) values.push(subIndex(pm10, PM10_BREAKPOINTS, 0));
  return Math.max(...values);
}

/** @param {number} aqi */
export function aqiCategory(aqi) {
  return CATEGORIES.find((c) => aqi <= c.max) ?? CATEGORIES[CATEGORIES.length - 1];
}
