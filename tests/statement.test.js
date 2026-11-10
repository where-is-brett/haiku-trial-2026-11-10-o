import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { NOT_A_STATEMENT, readStatement } from '../src/lib/statement.js';

const HEADER = 'Date,Description,Amount';
const BOM = '﻿';

test('a valid statement reads into rows with ISO dates and cents', () => {
  const rows = readStatement(`${HEADER}\n02/08/2026,Lowtide Grocers,5.80\n`);
  assert.deepEqual(rows, [{ date: '2026-08-02', description: 'Lowtide Grocers', cents: 580 }]);
});

test('brackets and a minus sign both read as money coming back', () => {
  const rows = readStatement(
    `${HEADER}\n15/09/2026,Marlowe Homewares REFUND,(40.00)\n25/08/2026,Brightwave Payroll,-2112.90\n`,
  );
  assert.deepEqual(rows.map((row) => row.cents), [-4000, -211290]);
});

test('a quoted description with a comma is read whole', () => {
  const rows = readStatement(`${HEADER}\n06/08/2026,"Pasta, Pizza & Co REF 3946",102.29\n`);
  assert.deepEqual(rows, [
    { date: '2026-08-06', description: 'Pasta, Pizza & Co REF 3946', cents: 10229 },
  ]);
});

test('a wrong header is refused with the plain error', () => {
  for (const text of ['Date,Payee,Amount\n', `${HEADER},Balance\n`, '']) {
    assert.throws(() => readStatement(text), { message: NOT_A_STATEMENT });
  }
});

test('a bad date or a bad amount is refused with the plain error', () => {
  const badLines = [
    '31/02/2026,Lowtide Grocers,5.80', // not a real day
    '2/08/2026,Lowtide Grocers,5.80', // not two digits
    '02-08-2026,Lowtide Grocers,5.80', // wrong separator
    '02/08/2026,Lowtide Grocers,abc',
    '02/08/2026,Lowtide Grocers,--5',
    '02/08/2026,Lowtide Grocers,12.5.0',
    '02/08/2026,Lowtide Grocers,"1,23.00"', // commas only in groups of three
    '02/08/2026,Lowtide Grocers,"1,2345.00"',
    '02/08/2026,Lowtide Grocers,"12,34,567.00"',
    '02/08/2026,Lowtide Grocers,",100.00"',
  ];
  for (const line of badLines) {
    assert.throws(() => readStatement(`${HEADER}\n${line}\n`), { message: NOT_A_STATEMENT }, line);
  }
});

test('thousands commas in groups of three are read as money', () => {
  const rows = readStatement(
    `${HEADER}\n02/08/2026,Big Payment,"1,234.00"\n03/08/2026,Bigger,"12,345.67"\n04/08/2026,Biggest,"1,000,000"\n`,
  );
  assert.deepEqual(rows.map((row) => row.cents), [123400, 1234567, 100000000]);
});

test('a byte-order mark and CRLF line endings read in full', () => {
  const rows = readStatement(`${BOM}${HEADER}\r\n02/08/2026,Lowtide Grocers,5.80\r\n`);
  assert.equal(rows.length, 1);
});

test('a header with no rows gives an empty list, and blank lines are ignored', () => {
  assert.deepEqual(readStatement(`${HEADER}\n`), []);
  const rows = readStatement(`${HEADER}\n\n02/08/2026,Lowtide Grocers,5.80\n\n\n`);
  assert.equal(rows.length, 1);
});

test('an unquoted comma in a description is refused, not read with shifted columns', () => {
  assert.throws(
    () => readStatement(`${HEADER}\n06/08/2026,Pasta, Pizza,102.29\n`),
    { message: NOT_A_STATEMENT },
  );
});

test('-0.00 and (0.00) read as zero, not negative zero', () => {
  const rows = readStatement(`${HEADER}\n01/08/2026,Refund,-0.00\n02/08/2026,Refund,(0.00)\n`);
  for (const row of rows) assert.ok(Object.is(row.cents, 0), `got ${row.cents}`);
});

test('the sample statement reads one row per line after the header', () => {
  const text = fs.readFileSync(new URL('../data/sample-statement.csv', import.meta.url), 'utf8');
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
  assert.equal(readStatement(text).length, lines.length - 1);
});
