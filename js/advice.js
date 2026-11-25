/**
 * Decision logic: who is asking + what they plan to do + current AQI -> advice.
 * Thresholds are applied to an "effective AQI" that grows with exertion.
 */

/** @typedef {{label: string, caution: number, avoid: number}} Persona */
/** @typedef {{label: string, factor: number}} Activity */

/** @type {Readonly<Record<string, Persona>>} */
export const PERSONAS = Object.freeze({
  general: { label: 'General adult', caution: 100, avoid: 200 },
  vulnerable: { label: 'Child or older adult', caution: 75, avoid: 150 },
  respiratory: { label: 'Asthma, heart or lung condition', caution: 50, avoid: 125 },
  worker: { label: 'Outdoor worker or commuter', caution: 100, avoid: 175 },
});

/** Multiplier models the higher inhaled dose when breathing harder. */
/** @type {Readonly<Record<string, Activity>>} */
export const ACTIVITIES = Object.freeze({
  rest: { label: 'Resting or indoors', factor: 1 },
  commute: { label: 'Commuting or walking', factor: 1.15 },
  exercise: { label: 'Exercising outdoors', factor: 1.4 },
});

export const LEVELS = Object.freeze({
  go: { id: 'go', rank: 0, icon: '✅', label: 'Go' },
  care: { id: 'care', rank: 1, icon: '⚠️', label: 'Take care' },
  avoid: { id: 'avoid', rank: 2, icon: '⛔', label: 'Avoid' },
});

const ADVICE = Object.freeze({
  go: {
    headline: 'Air quality is acceptable for your plan.',
    actions: ['Normal outdoor activity is fine.', 'Re-check later if conditions change.'],
  },
  care: {
    headline: 'Reduce prolonged or intense outdoor activity.',
    actions: [
      'Shorten outdoor time and keep exertion light.',
      'Prefer parks or side streets away from heavy traffic.',
      'Consider an N95/FFP2 mask for commutes.',
      'Carry any prescribed medication.',
    ],
  },
  avoid: {
    headline: 'Avoid outdoor exposure right now.',
    actions: [
      'Move activity indoors or postpone it.',
      'Keep windows closed and use an air purifier if you have one.',
      'If you must go out, wear a well-fitted N95/FFP2 mask.',
      'Seek medical advice if you have breathing difficulty or chest tightness.',
    ],
  },
});

/** @param {number} aqi @param {string} activityId */
export function effectiveAqi(aqi, activityId) {
  const activity = ACTIVITIES[activityId];
  if (!activity) throw new RangeError(`Unknown activity: ${activityId}`);
  return aqi * activity.factor;
}

/**
 * @param {number} aqi
 * @param {string} personaId
 * @param {string} activityId
 * @returns {{level: typeof LEVELS[keyof typeof LEVELS], headline: string, actions: readonly string[]}}
 */
export function advise(aqi, personaId, activityId) {
  const persona = PERSONAS[personaId];
  if (!persona) throw new RangeError(`Unknown persona: ${personaId}`);
  const effective = effectiveAqi(aqi, activityId);
  const key = effective >= persona.avoid ? 'avoid' : effective >= persona.caution ? 'care' : 'go';
  return { level: LEVELS[key], ...ADVICE[key] };
}

/**
 * Cleanest contiguous window (earliest wins ties).
 * @param {ReadonlyArray<{label: string, aqi: number}>} hours
 * @param {number} length number of hours needed
 * @returns {{startLabel: string, averageAqi: number} | null}
 */
export function bestWindow(hours, length) {
  if (!Number.isInteger(length) || length < 1 || hours.length < length) return null;
  let sum = hours.slice(0, length).reduce((total, hour) => total + hour.aqi, 0);
  let best = { sum, start: 0 };
  for (let i = 1; i + length <= hours.length; i += 1) {
    sum += hours[i + length - 1].aqi - hours[i - 1].aqi; // slide the window by one hour
    if (sum < best.sum) best = { sum, start: i };
  }
  return { startLabel: hours[best.start].label, averageAqi: Math.round(best.sum / length) };
}
