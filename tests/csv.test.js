// tests/csv.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitCsvLine } from '../src/lib/csv.js';

test('a quoted field keeps its comma and reads "" as one quote', () => {
  assert.deepEqual(splitCsvLine('03/08/2026,"Pasta, Pizza ""Co""",12.50'), [
    '03/08/2026',
    'Pasta, Pizza "Co"',
    '12.50',
  ]);
});

test('an unquoted extra comma gives an extra field', () => {
  assert.equal(splitCsvLine('03/08/2026,Pasta, Pizza,12.50').length, 4);
});

test('a quote that never closes, or text after a closing quote, is malformed', () => {
  assert.equal(splitCsvLine('a,"unclosed,1'), null);
  assert.equal(splitCsvLine('a,"quoted"x,1'), null);
});
