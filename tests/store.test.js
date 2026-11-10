// tests/store.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { storeRows } from '../src/lib/store.js';

const row = (date, description, cents) => ({ date, description, cents });
const count = (db) => db.prepare('SELECT COUNT(*) AS n FROM transactions').get().n;

test('a first import stores every row; the same import again adds nothing', () => {
  const db = new DatabaseSync(':memory:');
  const rows = [row('2026-08-02', 'Lowtide Grocers', 580), row('2026-08-25', 'Brightwave Payroll', -211290)];
  assert.deepEqual(storeRows(db, rows), { added: 2, skipped: 0 });
  assert.deepEqual(storeRows(db, rows), { added: 0, skipped: 2 });
  assert.equal(count(db), 2);
});

test('two identical lines in one file are both stored on the first import', () => {
  const db = new DatabaseSync(':memory:');
  const same = row('2026-08-02', 'Lowtide Grocers', 580);
  assert.deepEqual(storeRows(db, [same, same]), { added: 2, skipped: 0 });
});

test('a later file that extends an earlier one adds only the new lines', () => {
  const db = new DatabaseSync(':memory:');
  const lines = [row('2026-08-01', 'A', 100), row('2026-08-02', 'B', 200), row('2026-08-03', 'C', 300)];
  storeRows(db, lines);
  const more = [...lines, row('2026-08-04', 'D', 400), row('2026-08-05', 'E', 500)];
  assert.deepEqual(storeRows(db, more), { added: 2, skipped: 3 });
});

test('same date and description with different cents are both stored', () => {
  const db = new DatabaseSync(':memory:');
  assert.deepEqual(
    storeRows(db, [row('2026-08-02', 'Lowtide Grocers', 580), row('2026-08-02', 'Lowtide Grocers', 990)]),
    { added: 2, skipped: 0 },
  );
});

test('one stored copy and two identical lines in the file adds one and skips one', () => {
  const db = new DatabaseSync(':memory:');
  const same = row('2026-08-02', 'Lowtide Grocers', 580);
  storeRows(db, [same]);
  assert.deepEqual(storeRows(db, [same, same]), { added: 1, skipped: 1 });
  assert.equal(count(db), 2);
});

test('a failure part way through an import stores nothing from it', () => {
  const db = new DatabaseSync(':memory:');
  const bad = { date: '2026-08-03', description: 'Broken', cents: Symbol('not a number') };
  assert.throws(() => storeRows(db, [row('2026-08-01', 'A', 100), row('2026-08-02', 'B', 200), bad]));
  assert.equal(count(db), 0);
});
