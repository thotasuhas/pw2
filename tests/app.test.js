import test from 'node:test';
import assert from 'node:assert/strict';
import { initApp } from '../js/app.js';
import { NotFoundError, ServiceError } from '../js/errors.js';
import { createPage } from './support.js';

const city = {
  place: 'Testville',
  hours: [60, 80, 40].map((aqi, i) => ({ time: `t${i}`, label: `h${i}`, aqi })),
};
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

function start(lookup) {
  const { window, doc } = createPage();
  initApp({ document: doc, lookup });
  const submit = async () => {
    doc
      .querySelector('#search-form')
      .dispatchEvent(new window.Event('submit', { cancelable: true, bubbles: true }));
    await tick();
  };
  return { doc, submit };
}

test('fills the selects from the shared persona and activity tables', () => {
  const { doc } = start(async () => city);
  assert.equal(doc.querySelector('#persona').options.length, 4);
  assert.equal(doc.querySelector('#activity').options.length, 3);
  assert.equal(doc.querySelector('#duration').options.length, 4);
});

test('a successful lookup shows results and moves focus to the heading', async () => {
  const { doc, submit } = start(async () => city);
  await submit();
  assert.equal(doc.querySelector('#results').hidden, false);
  assert.equal(doc.querySelector('#results h2').textContent, 'Testville');
  assert.equal(doc.activeElement.id, 'results-heading');
  assert.equal(doc.querySelector('button[type="submit"]').disabled, false);
  assert.equal(doc.querySelector('#status').textContent, '');
});

test('choices change the advice', async () => {
  const { doc, submit } = start(async () => city);
  doc.querySelector('#persona').value = 'respiratory';
  doc.querySelector('#activity').value = 'exercise';
  await submit();
  assert.equal(doc.querySelector('.verdict').dataset.level, 'care');
  doc.querySelector('#persona').value = 'general';
  doc.querySelector('#activity').value = 'rest';
  await submit();
  assert.equal(doc.querySelector('.verdict').dataset.level, 'go');
});

test('expected errors are announced, flagged and focus returns to the field', async () => {
  const { doc, submit } = start(async () => {
    throw new NotFoundError('No place found for "Zzz".');
  });
  await submit();
  const error = doc.querySelector('#city-error');
  assert.equal(error.hidden, false);
  assert.equal(error.getAttribute('role'), 'alert');
  assert.equal(error.textContent, 'No place found for "Zzz".');
  assert.equal(doc.querySelector('#city').getAttribute('aria-invalid'), 'true');
  assert.equal(doc.querySelector('#results').hidden, true);
  assert.equal(doc.activeElement.id, 'city');
});

test('service and unexpected failures get friendly messages', async () => {
  const down = start(async () => {
    throw new ServiceError('Service error (503).');
  });
  await down.submit();
  assert.equal(down.doc.querySelector('#city-error').textContent, 'Service error (503). Please try again.');
  const bug = start(async () => {
    throw new TypeError('internal detail');
  });
  await bug.submit();
  assert.equal(bug.doc.querySelector('#city-error').textContent, 'Something went wrong. Please try again.');
});

test('a later success clears the previous error', async () => {
  let fail = true;
  const { doc, submit } = start(async () => {
    if (fail) throw new NotFoundError('nope');
    return city;
  });
  await submit();
  fail = false;
  await submit();
  assert.equal(doc.querySelector('#city-error').hidden, true);
  assert.equal(doc.querySelector('#city').getAttribute('aria-invalid'), 'false');
});

test('while loading the button is disabled and the status is announced', async () => {
  let release;
  const { doc, submit } = start(
    () =>
      new Promise((resolve) => {
        release = () => resolve(city);
      }),
  );
  await submit();
  assert.equal(doc.querySelector('button[type="submit"]').disabled, true);
  assert.equal(doc.querySelector('#status').textContent, 'Fetching air quality…');
  assert.equal(doc.querySelector('#results').getAttribute('aria-busy'), 'true');
  release();
  await tick();
  assert.equal(doc.querySelector('button[type="submit"]').disabled, false);
});

test('a superseded request is ignored', async () => {
  const releases = [];
  const lookup = (_q, { signal }) =>
    new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason));
      releases.push(() => resolve(city));
    });
  const { doc, submit } = start(lookup);
  await submit();
  await submit();
  releases[0]?.();
  releases[1]();
  await tick();
  assert.equal(doc.querySelector('#results').hidden, false);
  assert.equal(doc.querySelector('#city-error').hidden, true);
});

test('the page declares a language, landmarks and a skip link', () => {
  const { doc } = start(async () => city);
  assert.equal(doc.documentElement.lang, 'en');
  assert.ok(doc.querySelector('header') && doc.querySelector('main') && doc.querySelector('footer'));
  assert.equal(doc.querySelector('.skip-link').getAttribute('href'), '#main');
  assert.ok(doc.querySelector('label[for="city"]') && doc.querySelector('label[for="persona"]'));
});
