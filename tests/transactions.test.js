// tests/transactions.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { addCategoryColumn, findTransaction, setCategory } from '../src/lib/transactions.js';

// A database as the server had it before this slice: no category column.
function oldDb() {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE transactions (id INTEGER PRIMARY KEY, date TEXT, description TEXT, cents INTEGER)');
  db.prepare('INSERT INTO transactions (date, description, cents) VALUES (?, ?, ?)').run(
    '2026-08-02',
    'Lowtide Grocers',
    -580,
  );
  return db;
}

test('an existing transactions table gains a category column and keeps its rows', () => {
  const db = oldDb();
  addCategoryColumn(db);
  const columns = db.prepare('PRAGMA table_info(transactions)').all().map((c) => c.name);
  assert.ok(columns.includes('category'));
  assert.deepEqual(findTransaction(db, 1), {
    id: 1,
    date: '2026-08-02',
    description: 'Lowtide Grocers',
    cents: -580,
    category: null,
  });
});

test('adding the category column twice does nothing and does not throw', () => {
  const db = oldDb();
  addCategoryColumn(db);
  assert.doesNotThrow(() => addCategoryColumn(db));
});

test('a row with no stored category reads as no manual choice', () => {
  const db = oldDb();
  addCategoryColumn(db);
  assert.equal(findTransaction(db, 1).category, null);
});

test('an unknown id reads as null', () => {
  const db = oldDb();
  addCategoryColumn(db);
  assert.equal(findTransaction(db, 99), null);
});

test('a manual category is stored and read back', () => {
  const db = oldDb();
  addCategoryColumn(db);
  assert.equal(setCategory(db, 1, 'shopping'), true);
  assert.equal(findTransaction(db, 1).category, 'shopping');
});

test('saving the category the shop rule gives the row stores NULL', () => {
  const db = oldDb();
  addCategoryColumn(db);
  assert.equal(setCategory(db, 1, 'groceries'), true);
  assert.equal(findTransaction(db, 1).category, null);
});

test('an unknown key, a wrong-case key, a padded key and an empty key are refused and store nothing', () => {
  const db = oldDb();
  addCategoryColumn(db);
  for (const key of ['nope', 'Shopping', ' shopping', '']) {
    assert.throws(() => setCategory(db, 1, key), RangeError, key);
  }
  assert.equal(findTransaction(db, 1).category, null);
});

test('an unknown id returns false and stores nothing', () => {
  const db = oldDb();
  addCategoryColumn(db);
  assert.equal(setCategory(db, 99, 'shopping'), false);
  assert.equal(findTransaction(db, 1).category, null);
});
