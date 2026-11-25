import test from 'node:test';
import assert from 'node:assert/strict';
import { renderReport } from '../js/view.js';
import { createPage, sampleReport } from './support.js';

function render(report = sampleReport) {
  const { doc } = createPage();
  const container = doc.querySelector('#results');
  const heading = renderReport(doc, container, report);
  return { doc, container, heading };
}

test('renders place, AQI, category, verdict and actions', () => {
  const { container } = render();
  assert.equal(container.querySelector('h2').textContent, 'Testville, Nowhere');
  assert.equal(container.querySelector('.metric').textContent, 'AQI 120');
  assert.match(container.textContent, /Unhealthy for Sensitive Groups \(as of 25 Nov, 14:00\)/);
  const verdict = container.querySelector('.verdict');
  assert.equal(verdict.dataset.level, 'care');
  assert.match(verdict.querySelector('h3').textContent, /⚠️ Take care: Reduce activity\./);
  assert.equal(verdict.querySelectorAll('li').length, 2);
});

test('shows the cleanest window and omits it when there is none', () => {
  assert.match(
    render().container.textContent,
    /Cleanest 2-hour window today: starting 25 Nov, 18:00 \(average AQI 60\)/,
  );
  assert.doesNotMatch(render({ ...sampleReport, window: null }).container.textContent, /Cleanest/);
});

test('chart has one bar per hour, scaled to the maximum, plus a text alternative', () => {
  const { container } = render();
  const bars = [...container.querySelectorAll('.bars span')];
  assert.equal(bars.length, 4);
  assert.equal(bars[0].style.height, '100%');
  assert.equal(bars[2].style.height, '50%');
  assert.match(container.querySelector('.bars').getAttribute('aria-label'), /next 4 hours, highest 120/);
  assert.match(container.querySelector('.chart-axis').textContent, /h0.*Highest: AQI 120.*h3/);
});

test('data table is complete and accessible', () => {
  const { container } = render();
  assert.equal(container.querySelectorAll('tbody tr').length, 4);
  assert.deepEqual(
    [...container.querySelectorAll('th')].map((th) => th.getAttribute('scope')),
    ['col', 'col'],
  );
  assert.ok(container.querySelector('caption'));
});

test('untrusted text is rendered as text, never as HTML', () => {
  const evil = '<img src=x onerror=alert(1)>';
  const { container } = render({ ...sampleReport, place: evil });
  assert.equal(container.querySelector('img'), null);
  assert.equal(container.querySelector('h2').textContent, evil);
});

test('returns a focusable heading and replaces previous content', () => {
  const { doc, container, heading } = render();
  assert.equal(heading.getAttribute('tabindex'), '-1');
  renderReport(doc, container, sampleReport);
  assert.equal(container.querySelectorAll('.card').length, 1);
});
