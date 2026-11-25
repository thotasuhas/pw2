/** View-model builder: turns a CityReport + user choices into display-ready data. */
import { advise, bestWindow } from './advice.js';
import { aqiCategory } from './aqi.js';

/**
 * @param {import('./data.js').CityReport} city
 * @param {{personaId: string, activityId: string, durationHours: number}} choices
 */
export function buildReport(city, { personaId, activityId, durationHours }) {
  const [now] = city.hours;
  return {
    place: city.place,
    currentAqi: now.aqi,
    currentLabel: now.label,
    category: aqiCategory(now.aqi),
    advice: advise(now.aqi, personaId, activityId),
    window: bestWindow(city.hours, durationHours),
    durationHours,
    series: city.hours,
  };
}
