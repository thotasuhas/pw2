/** UI wiring only: reads the form, calls the pure modules, renders safely via textContent. */
import { ACTIVITIES, PERSONAS } from './advice.js';
import { createCachedFetcher, NotFoundError, ServiceError, ValidationError } from './data.js';
import { buildReport } from './report.js';

const $ = (selector) => document.querySelector(selector);
const form = $('#search-form');
const cityInput = $('#city');
const cityError = $('#city-error');
const statusEl = $('#status');
const results = $('#results');
const submit = form.querySelector('button[type="submit"]');
const lookup = createCachedFetcher();
let inFlight = null;

/** Tiny DOM helper: h('p', {class: 'x'}, 'text', childNode). Text is never parsed as HTML. */
function h(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  node.append(...children);
  return node;
}

function fillSelect(select, entries) {
  select.replaceChildren(...entries.map(([value, label]) => h('option', { value }, label)));
}
fillSelect($('#persona'), Object.entries(PERSONAS).map(([id, p]) => [id, p.label]));
fillSelect($('#activity'), Object.entries(ACTIVITIES).map(([id, a]) => [id, a.label]));
fillSelect($('#duration'), [1, 2, 3, 4].map((n) => [String(n), `${n} hour${n > 1 ? 's' : ''}`]));

function showCityError(message) {
  cityError.textContent = message ?? '';
  cityError.hidden = !message;
  cityInput.setAttribute('aria-invalid', message ? 'true' : 'false');
}

function render(report) {
  const { advice, category, window: best, series } = report;
  const max = Math.max(...series.map((s) => s.aqi), 1);
  const bars = h('div', { class: 'bars', role: 'img', 'aria-label': `Bar chart of hourly AQI for the next ${series.length} hours. The same values are in the table below.` });
  for (const reading of series) {
    const bar = h('span');
    bar.style.height = `${(reading.aqi / max) * 100}%`;
    bars.append(bar);
  }
  const table = h('table', {}, h('caption', {}, 'Hourly AQI'),
    h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Time'), h('th', { scope: 'col' }, 'AQI'))),
    h('tbody', {}, ...series.map((s) => h('tr', {}, h('td', {}, s.label), h('td', {}, String(s.aqi))))));

  const heading = h('h2', { id: 'results-heading', tabindex: '-1' }, report.place);
  results.replaceChildren(h('div', { class: 'card' },
    heading,
    h('p', { class: 'metric' }, `AQI ${report.currentAqi}`),
    h('p', {}, `${category.name} (as of ${report.currentLabel})`),
    h('div', { class: 'verdict', 'data-level': advice.level.id },
      h('h3', {}, `${advice.level.icon} ${advice.level.label}: ${advice.headline}`),
      h('ul', {}, ...advice.actions.map((a) => h('li', {}, a)))),
    best ? h('p', {}, `Cleanest ${report.durationHours}-hour window today: starting ${best.startLabel} (average AQI ${best.averageAqi}).`) : '',
    bars,
    h('details', {}, h('summary', {}, 'Show hourly data as a table'), table)));
  results.hidden = false;
  heading.focus();
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  inFlight?.abort(new DOMException('Superseded by a newer request', 'AbortError'));
  inFlight = new AbortController();
  const { signal } = inFlight;
  showCityError(null);
  submit.disabled = true;
  statusEl.textContent = 'Fetching air quality…';
  try {
    const city = await lookup(cityInput.value, { signal });
    render(buildReport(city, {
      personaId: $('#persona').value,
      activityId: $('#activity').value,
      durationHours: Number($('#duration').value),
    }));
    statusEl.textContent = '';
  } catch (error) {
    if (signal.aborted && error?.name === 'AbortError') return;
    statusEl.textContent = '';
    results.hidden = true;
    if (error instanceof ValidationError || error instanceof NotFoundError) showCityError(error.message);
    else if (error instanceof ServiceError) showCityError(`${error.message} Please try again.`);
    else showCityError('Something went wrong. Please try again.');
    cityInput.focus();
  } finally {
    if (inFlight?.signal === signal) submit.disabled = false;
  }
});
