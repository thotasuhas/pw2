/** Rendering: turns a report view-model into DOM. No state, no network. */
import { el } from './dom.js';

/**
 * @typedef {ReturnType<typeof import('./report.js').buildReport>} Report
 * @typedef {Report['series']} Series
 */

/** @param {Document} doc @param {Series} series */
function buildChart(doc, series) {
  const max = Math.max(...series.map((reading) => reading.aqi), 1);
  const bars = el(doc, 'div', {
    class: 'bars',
    role: 'img',
    'aria-label': `Bar chart of hourly AQI for the next ${series.length} hours, highest ${max}. The same values are in the table below.`,
  });
  for (const reading of series) {
    const bar = el(doc, 'span');
    bar.style.height = `${(reading.aqi / max) * 100}%`;
    bars.append(bar);
  }
  const axis = el(
    doc,
    'p',
    { class: 'chart-axis hint' },
    el(doc, 'span', {}, series[0].label),
    el(doc, 'span', {}, `Highest: AQI ${max}`),
    el(doc, 'span', {}, series[series.length - 1].label),
  );
  return [bars, axis];
}

/** @param {Document} doc @param {Series} series */
function buildTable(doc, series) {
  const header = el(
    doc,
    'tr',
    {},
    el(doc, 'th', { scope: 'col' }, 'Time'),
    el(doc, 'th', { scope: 'col' }, 'AQI'),
  );
  const rows = series.map((reading) =>
    el(doc, 'tr', {}, el(doc, 'td', {}, reading.label), el(doc, 'td', {}, String(reading.aqi))),
  );
  return el(
    doc,
    'table',
    {},
    el(doc, 'caption', {}, 'Hourly AQI'),
    el(doc, 'thead', {}, header),
    el(doc, 'tbody', {}, ...rows),
  );
}

/** @param {Document} doc @param {Report['advice']} advice */
function buildVerdict(doc, advice) {
  const { level, headline, actions } = advice;
  return el(
    doc,
    'div',
    { class: 'verdict', 'data-level': level.id },
    el(doc, 'h3', {}, `${level.icon} ${level.label}: ${headline}`),
    el(doc, 'ul', {}, ...actions.map((action) => el(doc, 'li', {}, action))),
  );
}

/**
 * Replaces the container's content with the report.
 * @param {Document} doc
 * @param {HTMLElement} container
 * @param {Report} report
 * @returns {HTMLElement} the heading, so the caller can move focus to it
 */
export function renderReport(doc, container, report) {
  const heading = el(doc, 'h2', { id: 'results-heading', tabindex: '-1' }, report.place);
  const windowText = report.window
    ? `Cleanest ${report.durationHours}-hour window today: starting ${report.window.startLabel} (average AQI ${report.window.averageAqi}).`
    : '';
  container.replaceChildren(
    el(
      doc,
      'div',
      { class: 'card' },
      heading,
      el(doc, 'p', { class: 'metric' }, `AQI ${report.currentAqi}`),
      el(doc, 'p', {}, `${report.category.name} (as of ${report.currentLabel})`),
      buildVerdict(doc, report.advice),
      el(doc, 'p', {}, windowText),
      ...buildChart(doc, report.series),
      el(
        doc,
        'details',
        {},
        el(doc, 'summary', {}, 'Show hourly data as a table'),
        buildTable(doc, report.series),
      ),
    ),
  );
  return heading;
}
