const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const LOCAL_ISO = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/;

/**
 * "2026-11-25T14:00" -> "25 Nov, 14:00". Unrecognised input is returned unchanged.
 * @param {string} iso
 */
export function formatHourLabel(iso) {
  const match = LOCAL_ISO.exec(iso);
  if (!match) return iso;
  const [, , month, day, hour, minute] = match;
  return `${Number(day)} ${MONTHS[Number(month) - 1]}, ${hour}:${minute}`;
}

/**
 * Index of the current local hour in a list of the city's local ISO times.
 * @param {readonly string[]} times
 * @param {number} utcOffsetSeconds the city's UTC offset
 * @param {number} nowMs epoch milliseconds
 * @returns {number} the index, or 0 when the current hour is not listed
 */
export function currentHourIndex(times, utcOffsetSeconds, nowMs) {
  const localHour = `${new Date(nowMs + utcOffsetSeconds * 1000).toISOString().slice(0, 13)}:00`;
  return Math.max(times.indexOf(localHour), 0);
}
