// tests/money-edge.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAmount } from '../src/lib/money.js';

// Characterisation tests: they record what parseAmount does today.

test('a blank amount is read as NaN', () => {
  assert.ok(Number.isNaN(parseAmount('')));
});

test('a negative amount is read as negative cents', () => {
  assert.equal(parseAmount('-40.00'), -4000);
});

test('a thousands comma is ignored', () => {
  assert.equal(parseAmount('1,234.50'), 123450);
});
