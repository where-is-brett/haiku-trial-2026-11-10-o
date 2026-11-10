// tests/categories.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES } from '../src/lib/categories.js';

test('CATEGORIES lists the eight keys and labels in order', () => {
  assert.deepEqual(CATEGORIES, [
    { key: 'groceries', label: 'Groceries' },
    { key: 'eating_out', label: 'Eating out' },
    { key: 'transport', label: 'Transport' },
    { key: 'bills', label: 'Bills' },
    { key: 'shopping', label: 'Shopping' },
    { key: 'health', label: 'Health' },
    { key: 'income', label: 'Income' },
    { key: 'other', label: 'Other' },
  ]);
});
