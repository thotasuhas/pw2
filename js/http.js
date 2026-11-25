import { ServiceError } from './errors.js';

/**
 * @typedef {object} RequestContext
 * @property {typeof fetch} fetchFn
 * @property {number} timeoutMs
 * @property {AbortSignal} [signal] caller-supplied cancellation
 */

/**
 * GET a JSON document with a timeout and cancellation; failures become ServiceError
 * (or the caller's abort reason).
 * @param {string} url
 * @param {RequestContext} context
 * @returns {Promise<any>}
 */
export async function requestJson(url, { fetchFn, timeoutMs, signal }) {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new ServiceError('The air quality service timed out.')),
    timeoutMs,
  );
  const forwardAbort = () => controller.abort(signal?.reason);
  signal?.addEventListener('abort', forwardAbort, { once: true });
  try {
    const response = await fetchFn(url, { signal: controller.signal });
    if (!response.ok) throw new ServiceError(`Air quality service error (${response.status}).`);
    return await response.json();
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    if (controller.signal.aborted) throw controller.signal.reason ?? error;
    throw new ServiceError('Could not reach the air quality service.');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', forwardAbort);
  }
}
