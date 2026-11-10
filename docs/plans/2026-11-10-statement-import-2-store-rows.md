# Statement import, slice 2: Store rows without duplicates Implementation Plan

**Goal:** Rows read from a statement are stored once. Importing the same statement again adds nothing; a refused or failed import stores nothing.

**Architecture:** One function, `storeRows(db, rows)`, in a new module `src/lib/store.js`. It matches each row against the stored rows by date, description and cents, using an occurrence count so that each stored row matches at most one line of an upload. The rows that are new go in one database transaction. No page, route or flag reads it yet; slice 3 calls it from `/import`.

**Tech Stack:** Node 22.13 or later, `node:sqlite` (`DatabaseSync`), `node:test`, `node:assert/strict`. No new dependency.

## Global Constraints

- Node 22.13 or later (`engines` in `package.json`); add no dependency.
- Tests run with `node --test` (`npm test`).
- The `transactions` table is `id INTEGER PRIMARY KEY, date TEXT, description TEXT, cents INTEGER`, as `src/server.js` creates it. Do not change the schema.
- `parseAmount` and `parseDate` are not changed.
- Stored amounts and descriptions are printed nowhere, not even in tests' output messages.

## Review Focus

1. A later import of a file that extends an earlier one (lines 1 to 3 stored, then lines 1 to 5 uploaded) adds only lines 4 and 5. (Task 1)
2. Two rows with the same date and description but different cents are different transactions, both stored. (Task 1)
3. A failure part way through leaves no rows from that upload, including rows stored earlier in the same call. (Task 3)

---

### Task 1: Store new rows and skip rows already stored

**Files:**
- Create: `src/lib/store.js`
- Test: `tests/store.test.js`

**Interfaces:**
- Consumes: rows of `{ date: string, description: string, cents: number }` as `readStatement` returns them (`src/lib/statement.js`, slice 1).
- Produces: `storeRows(db: DatabaseSync, rows: Array<{date, description, cents}>) -> { added: number, skipped: number }`, and `TRANSACTIONS_SQL: string`, the `CREATE TABLE IF NOT EXISTS transactions (...)` statement, which `storeRows` runs first so the table exists.

Matching rule (the spec's rule, to implement exactly): for a row, count the stored rows with the same date, description and cents, S. Count the rows of this upload with the same key seen so far, k (0-based, counting this row's position among them). If k < S the row is skipped; otherwise it is added. This makes one stored copy match one line of the upload.

- [ ] **Step 1: Write the failing test**

```js
// tests/store.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { storeRows, TRANSACTIONS_SQL } from '../src/lib/store.js';

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
```

Note for the builder: the test creates no table itself; `storeRows` creates it. `TRANSACTIONS_SQL` is imported only if a test needs it; drop the import if unused.

- [ ] **Step 2: Run test to verify it fails** — `node --test tests/store.test.js`, expected: "Cannot find module" for `src/lib/store.js`.

- [ ] **Step 3: Implement `storeRows` and `TRANSACTIONS_SQL` in `src/lib/store.js`.** Use the matching rule above. Read the stored count per key with a prepared statement. Do not write the transaction yet (Task 3 adds it).

- [ ] **Step 4: Run** `node --test tests/store.test.js` — expected PASS, 4 tests. Then `npm test` — all tests pass.

- [ ] **Step 5: Commit** — `git add src/lib/store.js tests/store.test.js && git commit -m "feat: store statement rows without duplicates"`

### Task 2: One stored copy matches one line of an upload

**Files:**
- Modify: `tests/store.test.js` (add tests)
- Modify: `src/lib/store.js` only if the test fails

**Interfaces:**
- Consumes: `storeRows` from Task 1.
- Produces: nothing new.

- [ ] **Step 1: Write the failing test**

```js
test('one stored copy and two identical lines in the file adds one and skips one', () => {
  const db = new DatabaseSync(':memory:');
  const same = row('2026-08-02', 'Lowtide Grocers', 580);
  storeRows(db, [same]);
  assert.deepEqual(storeRows(db, [same, same]), { added: 1, skipped: 1 });
  assert.equal(count(db), 2);
});
```

- [ ] **Step 2: Run** `node --test tests/store.test.js` — expected: FAIL only if Task 1's matching is wrong; if it already passes, record that in the commit message and go on.
- [ ] **Step 3: Fix the matching in `src/lib/store.js` if the test failed.** Otherwise no change.
- [ ] **Step 4: Run** `node --test tests/store.test.js` — expected PASS, 5 tests.
- [ ] **Step 5: Commit** — `git add tests/store.test.js src/lib/store.js && git commit -m "test: a stored copy matches one line of an upload"` (omit `src/lib/store.js` if unchanged).

### Task 3: A failed import stores nothing

**Files:**
- Modify: `src/lib/store.js`
- Modify: `tests/store.test.js`

**Interfaces:**
- Consumes: `storeRows` from Task 1.
- Produces: `storeRows` now writes the new rows in one transaction: `BEGIN` before the first insert, `COMMIT` after the last, `ROLLBACK` if any insert throws; the error is rethrown.

- [ ] **Step 1: Write the failing test**

```js
test('a failure part way through an import stores nothing from it', () => {
  const db = new DatabaseSync(':memory:');
  const bad = { date: '2026-08-03', description: 'Broken', cents: Symbol('not a number') };
  assert.throws(() => storeRows(db, [row('2026-08-01', 'A', 100), row('2026-08-02', 'B', 200), bad]));
  assert.equal(count(db), 0);
});
```

Note for the builder: `node:sqlite` refuses to bind a Symbol, so the insert of `bad` throws after the first two rows are inserted. If it does not throw, pick another value node:sqlite refuses to bind and say which in the report.

- [ ] **Step 2: Run** `node --test tests/store.test.js` — expected FAIL: the count is 2, not 0.
- [ ] **Step 3: Wrap the inserts in a transaction** in `src/lib/store.js`: `BEGIN`, the inserts, `COMMIT`; on error `ROLLBACK` and rethrow.
- [ ] **Step 4: Run** `node --test tests/store.test.js` — expected PASS, 6 tests. Then `npm test` — all pass.
- [ ] **Step 5: Commit** — `git add src/lib/store.js tests/store.test.js && git commit -m "feat: store an upload in one transaction"`

