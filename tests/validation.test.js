import test from 'node:test';
import assert from 'node:assert/strict';
import { ValidationError } from '../js/errors.js';
import { cleanQuery } from '../js/validation.js';

test('cleanQuery trims, collapses spaces and accepts unicode', () => {
  assert.equal(cleanQuery('  New   Delhi '), 'New Delhi');
  assert.equal(cleanQuery('Zürich'), 'Zürich');
  assert.equal(cleanQuery("St. John's"), "St. John's");
  assert.equal(cleanQuery('हैदराबाद'), 'हैदराबाद');
});

test('cleanQuery rejects unsafe or malformed input', () => {
  for (const bad of [
    '',
    ' ',
    'a',
    'x'.repeat(81),
    'x;DROP TABLE',
    '<script>alert(1)</script>',
    'a&b=c',
    'city\n/../x',
    null,
    undefined,
  ]) {
    assert.throws(() => cleanQuery(bad), ValidationError, JSON.stringify(bad));
  }
});
