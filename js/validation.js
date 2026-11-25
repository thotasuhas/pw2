import { ValidationError } from './errors.js';

export const QUERY_MIN_LENGTH = 2;
export const QUERY_MAX_LENGTH = 80;
/** Letters, combining marks (Indic scripts), digits and a few punctuation marks. */
const ALLOWED_QUERY = /^[\p{L}\p{M}\p{N} .,'-]+$/u;

/**
 * Normalises and whitelists a city search string.
 * @param {unknown} raw
 * @returns {string}
 * @throws {ValidationError}
 */
export function cleanQuery(raw) {
  const query = String(raw ?? '')
    .trim()
    .replace(/\s+/g, ' ');
  const validLength = query.length >= QUERY_MIN_LENGTH && query.length <= QUERY_MAX_LENGTH;
  if (!validLength || !ALLOWED_QUERY.test(query)) {
    throw new ValidationError("Enter a city name (2-80 letters, numbers, spaces or . , ' -).");
  }
  return query;
}
