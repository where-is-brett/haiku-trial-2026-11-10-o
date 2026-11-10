# Edit transaction category, slice 1: Store the category Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A transaction can hold a manual category in the `transactions` table, and a row with no choice reads as no manual choice, so the shop rule applies.

**Architecture:** One new module, `src/lib/transactions.js`, holds three functions that take a `DatabaseSync` handle, so tests can use an in-memory database. `src/server.js` calls the column-adding function once at startup, right after the table is created. No page changes in this slice.

**Tech Stack:** Node 22.13 or later, `node:sqlite` (`DatabaseSync`), `node:test`, `node:assert/strict`. No new dependency.

**Spec:** `.wheelhouse/feature/approved.md`

## Global Constraints

- Node `>=22.13`, ESM (`"type": "module"`), no new dependencies.
- Tests run with `npm test` (`node --test`).
- The category column is nullable `TEXT`; `NULL` means no manual choice.
- The only category keys stored are the eight keys in `CATEGORIES` (`src/lib/categories.js`), spelt exactly as there.
- Do not change `parseAmount`, `parseDate`, `monthOf`, or the shop list in `src/lib/categories.js`.
- Do not add a page or a route in this slice.

## Review Focus

1. Running the column add on a table that already has the column does nothing and does not throw.
2. A key with the wrong case or surrounding spaces (`Groceries`, ` groceries`) and an empty string are refused and store nothing.
3. Saving the category the shop rule already gives a row stores `NULL`, so the row keeps following the shop rules.
4. An unknown id given to the store function returns `false` and stores nothing.
5. Rows that existed before the column was added keep their date, description and cents.

Each line has its test in the task that owns it.

---

### Task 1: Store and read the manual category

**Files:**
- Create: `src/lib/transactions.js`
- Test: `tests/transactions.test.js`

**Interfaces:**
- Consumes: `CATEGORIES: Array<{ key: string, label: string }>` and `categoryOf(description: string) -> string` from `src/lib/categories.js` (already on the branch).
- Produces:
  - `addCategoryColumn(db: DatabaseSync) -> void`. Adds `category TEXT` to `transactions` when the column is missing; does nothing when it is there.
  - `findTransaction(db: DatabaseSync, id: number) -> { id: number, date: string, description: string, cents: number, category: string | null } | null`. `category` is `null` when no manual choice is stored. Returns `null` for an unknown id.
  - `setCategory(db: DatabaseSync, id: number, key: string) -> boolean`. Throws `RangeError('unknown category key')` when `key` is not one of the eight keys (checked before the id, so nothing is stored). Returns `false` when no row has that `id`. When `key` equals `categoryOf(row.description)`, stores `NULL`; otherwise stores `key`. Returns `true` when a row was updated.

- [ ] **Step 1: Write the failing tests**

```js
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/transactions.test.js`
Expected: FAIL with "Cannot find module" for `src/lib/transactions.js`.

- [ ] **Step 3: Implement the three functions in `src/lib/transactions.js`**

- `addCategoryColumn` reads `PRAGMA table_info(transactions)` and runs `ALTER TABLE transactions ADD COLUMN category TEXT` only when no column is named `category`.
- `findTransaction` selects `id, date, description, cents, category` for the id with a prepared statement and returns the row, or `null` when there is none.
- `setCategory` checks the key against `CATEGORIES` first and throws the `RangeError`. Then it reads the row's description; no row gives `false`. It compares the key with `categoryOf(description)`, stores `NULL` when they match and the key otherwise, and returns `true`.
- Use `//` comments in the same style as `src/lib/categories.js`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/transactions.test.js`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/transactions.js tests/transactions.test.js
git commit -m "feat: store a manual transaction category"
```

---

### Task 2: Add the column at server start and add the feature switch

**Files:**
- Modify: `src/server.js:8-10` (import the function, call it right after the `CREATE TABLE` statement)
- Modify: `config/feature-flags.json` (add the key `edit-category` set to `false`)
- Modify: `tests/feature-flags.test.js` (add a test for the new key)

**Interfaces:**
- Consumes: `addCategoryColumn(db: DatabaseSync) -> void` from Task 1.
- Produces: the `edit-category` key in `config/feature-flags.json`, with the value `false`. Nothing reads it in this slice; slices 2 and 3 gate their routes on it.

- [ ] **Step 1: Write the failing test**

Add to `tests/feature-flags.test.js`:

```js
test('the edit-category switch is in the feature flags file and is off until the pages are built', () => {
  const flags = JSON.parse(fs.readFileSync(new URL('../config/feature-flags.json', import.meta.url), 'utf8'));
  assert.equal(flags['edit-category'], false);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/feature-flags.test.js`
Expected: FAIL, `flags['edit-category']` is `undefined`.

- [ ] **Step 3: Make the change**

- In `config/feature-flags.json`, add `"edit-category": false` after `"import-statement": true`, keeping the file's two-space indent.
- In `src/server.js`, import `addCategoryColumn` from `./lib/transactions.js` and call `addCategoryColumn(db);` on the line after the `CREATE TABLE IF NOT EXISTS transactions` statement. Change nothing else in the file.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, all tests (the 28 existing ones plus the 8 from Task 1 and the 1 from this task).

Then check that the server still starts on a fresh database:

Run: `LEDGER_DB=$TMPDIR/slice1-check.db PORT=3917 timeout 2 node src/server.js; echo exit $?`
Expected: prints `listening on 3917`, then exits with code 124 from `timeout` (the server runs until stopped). Any exception at startup is a failure.

- [ ] **Step 5: Commit**

```bash
git add src/server.js config/feature-flags.json tests/feature-flags.test.js
git commit -m "feat: add the category column at start and an edit-category switch"
```

---

## Notes for the executor

- The `edit-category` switch is set to `false` in this slice because no route reads it yet. Slice 3 decides whether it is switched on; the approved document says `true`, and switching it on for users is a director's question at decision level 3, so it is asked there, not here.
- The import keeps stored categories is a rule for the statement import, not for this slice. Nothing in this slice writes rows from an import.
