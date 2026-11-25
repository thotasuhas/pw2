import test from 'node:test';
import assert from 'node:assert/strict';
import { AppError, NotFoundError, ServiceError, ValidationError, userMessage } from '../js/errors.js';

test('errors carry their class name and share a base class', () => {
  for (const E of [ValidationError, NotFoundError, ServiceError]) {
    const error = new E('x');
    assert.ok(error instanceof AppError && error instanceof Error);
    assert.equal(error.name, E.name);
  }
});

test('user messages are friendly and never leak internals', () => {
  assert.equal(userMessage(new ValidationError('Bad city.')), 'Bad city.');
  assert.equal(userMessage(new NotFoundError('No place.')), 'No place.');
  assert.equal(userMessage(new ServiceError('Down.')), 'Down. Please try again.');
  assert.equal(userMessage(new TypeError('secret stack detail')), 'Something went wrong. Please try again.');
  assert.equal(userMessage('weird'), 'Something went wrong. Please try again.');
});
