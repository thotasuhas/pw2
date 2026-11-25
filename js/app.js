/** Controller: reads the form, calls the pure modules, updates the page. */
import { ACTIVITIES, PERSONAS } from './advice.js';
import { fillSelect, required } from './dom.js';
import { userMessage } from './errors.js';
import { buildReport } from './report.js';
import { renderReport } from './view.js';

const DURATION_CHOICES = [1, 2, 3, 4];

/**
 * @param {{document: Document, lookup: import('./data.js').CityFetcher}} deps
 */
export function initApp({ document: doc, lookup }) {
  const form = /** @type {HTMLFormElement} */ (required(doc, '#search-form'));
  const cityInput = /** @type {HTMLInputElement} */ (required(doc, '#city'));
  const personaSelect = /** @type {HTMLSelectElement} */ (required(doc, '#persona'));
  const activitySelect = /** @type {HTMLSelectElement} */ (required(doc, '#activity'));
  const durationSelect = /** @type {HTMLSelectElement} */ (required(doc, '#duration'));
  const submitButton = /** @type {HTMLButtonElement} */ (required(doc, 'button[type="submit"]'));
  const errorEl = /** @type {HTMLElement} */ (required(doc, '#city-error'));
  const statusEl = /** @type {HTMLElement} */ (required(doc, '#status'));
  const results = /** @type {HTMLElement} */ (required(doc, '#results'));
  /** @type {AbortController | null} */
  let inFlight = null;

  fillSelect(
    doc,
    personaSelect,
    Object.entries(PERSONAS).map(([id, persona]) => [id, persona.label]),
  );
  fillSelect(
    doc,
    activitySelect,
    Object.entries(ACTIVITIES).map(([id, activity]) => [id, activity.label]),
  );
  fillSelect(
    doc,
    durationSelect,
    DURATION_CHOICES.map((hours) => [String(hours), `${hours} hour${hours > 1 ? 's' : ''}`]),
  );

  /** @param {string | null} message */
  function setError(message) {
    errorEl.textContent = message ?? '';
    errorEl.hidden = message === null;
    cityInput.setAttribute('aria-invalid', String(message !== null));
  }

  /** @param {boolean} busy */
  function setBusy(busy) {
    submitButton.disabled = busy;
    statusEl.textContent = busy ? 'Fetching air quality…' : '';
    results.setAttribute('aria-busy', String(busy));
  }

  /** @param {Event} event */
  async function handleSubmit(event) {
    event.preventDefault();
    inFlight?.abort(new DOMException('Superseded by a newer request.', 'AbortError'));
    const controller = new AbortController();
    inFlight = controller;
    setError(null);
    setBusy(true);
    try {
      const city = await lookup(cityInput.value, { signal: controller.signal });
      const report = buildReport(city, {
        personaId: personaSelect.value,
        activityId: activitySelect.value,
        durationHours: Number(durationSelect.value),
      });
      const heading = renderReport(doc, results, report);
      results.hidden = false;
      heading.focus();
    } catch (error) {
      if (controller.signal.aborted) return; // a newer request owns the page now
      results.hidden = true;
      setError(userMessage(error));
      cityInput.focus();
    } finally {
      if (inFlight === controller) {
        inFlight = null;
        setBusy(false);
      }
    }
  }

  form.addEventListener('submit', handleSubmit);
}
