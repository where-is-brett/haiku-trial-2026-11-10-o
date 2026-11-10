# Statement import, slice 1: Read a statement Implementation Plan

**Goal:** A bank statement's text becomes rows of date, description and cents, or the plain error "This file isn't a bank statement with Date, Description and Amount columns." when it is not a statement.

**Architecture:** A small hand-written CSV line reader (`src/lib/csv.js`) feeds a pure reader (`src/lib/statement.js`) that checks each line's text before it calls the existing `parseDate` and `parseAmount`. Nothing is stored and no page changes in this slice. A feature switch file is created with the key `import-statement` set to `true`, as the approved document says; nothing reads it yet.

**Tech Stack:** Node 22.13 or later, `node:test`, `node:assert/strict`. No new dependency.

## Global Constraints

- Node 22.13 or later (`engines` in `package.json`); add no dependency.
- Tests run with `node --test` (`npm test`).
- `parseAmount` in `src/lib/money.js` and `parseDate` in `src/lib/dates.js` are not changed.
- Amounts are whole cents; money coming back is negative; `-0` is never produced.
- The header is exactly `Date,Description,Amount` after trimming spaces and a byte-order mark.
- Dates are `DD/MM/YYYY` and must be real calendar dates (`31/02/2026` is refused).
- Amounts are digits with at most one decimal point, optionally in brackets `(40.00)` or with a leading minus. Anything else is refused.
- A refused statement gives the same plain error every time: `This file isn't a bank statement with Date, Description and Amount columns.`

## Review Focus

1. A bank export with a byte-order mark and CRLF line endings must read in full, header included. (Task 2)
2. A description with a comma inside quotes, and a doubled quote inside it, must be read whole. (Tasks 1 and 2)
3. A description with an unquoted comma must be refused with the plain error, never read with shifted columns. (Task 2)
4. A file with only the header gives an empty list, not an error; blank lines before or after rows are ignored. (Task 2)
5. `-0.00` and `(0.00)` read as `0`, not negative zero. (Task 2)

---

### Task 1: Read one CSV line into fields

**Files:**
- Create: `src/lib/csv.js`
- Test: `tests/csv.test.js`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `splitCsvLine(line: string) -> string[] | null`. Returns the fields of one line, or `null` when the line is malformed: a quote that never closes, or any text between a closing quote and the next comma or the end of the line. Rules: each field is trimmed of spaces at both ends before it is read. A field that starts with `"` is quoted: its contents run to the closing quote, `""` inside them is one literal `"`, and commas inside are kept. Its contents are returned as read, without further trimming. An unquoted field is returned as it is after trimming, and a `"` inside an unquoted field is literal. A line with no commas returns one field.

- [ ] **Step 1: Write the failing test**

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/csv.test.js`
Expected: FAIL with "Cannot find module" for `src/lib/csv.js`.

- [ ] **Step 3: Implement `splitCsvLine(line: string) -> string[] | null` in `src/lib/csv.js`**

Walk the line one field at a time, following the rules in Interfaces. Use `//` comments in the same style as `src/lib/money.js`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/csv.test.js`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/csv.js tests/csv.test.js
git commit -m "feat: read one CSV line into fields"
```

---

### Task 2: Read a statement into rows

**Files:**
- Create: `src/lib/statement.js`
- Test: `tests/statement.test.js`

**Interfaces:**
- Consumes: `splitCsvLine(line: string) -> string[] | null` from `src/lib/csv.js` (Task 1); `parseDate(text: string) -> string` from `src/lib/dates.js`; `parseAmount(text: string) -> number` from `src/lib/money.js`.
- Produces:
  - `NOT_A_STATEMENT: string`, the plain error text given above.
  - `readStatement(text: string) -> Array<{ date: string, description: string, cents: number }>`. The date is ISO `YYYY-MM-DD`; `cents` is a whole number, negative for money coming back. Rows come in file order. Throws `new Error(NOT_A_STATEMENT)` for any refused statement, and returns `[]` for a header with no rows.

Rules the reader follows (fixed by the approved document, so the code must match them):
- Remove a leading `﻿`. Split on `/\r?\n/`. The first line, trimmed, must equal `Date,Description,Amount`.
- Each later line that is blank after trimming is skipped. Any other line goes to `splitCsvLine`; `null`, or a result with a length other than 3, is refused.
- Date: the trimmed field must match `/^\d{2}\/\d{2}\/\d{4}$/` and be a real calendar date. Check this by building `Date.UTC(year, month - 1, day)` and comparing its day, month and year with the parts. Then return `parseDate` of the trimmed field.
- Amount: trim it. If it is wrapped in `(` and `)`, strip them and mark it negative. Otherwise, if it starts with `-`, strip the minus and mark it negative. The rest must match `/^\d+(\.\d+)?$/`, or the line is refused. `cents` is `parseAmount` of the rest, negated when marked negative; a result of zero is never negated.
- Description: the trimmed field.

- [ ] **Step 1: Write the failing test**

```js
// tests/statement.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { NOT_A_STATEMENT, readStatement } from '../src/lib/statement.js';

const HEADER = 'Date,Description,Amount';

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
    '02/08/2026,Lowtide Grocers,"1,234.50"', // thousands separator is refused
  ];
  for (const line of badLines) {
    assert.throws(() => readStatement(`${HEADER}\n${line}\n`), { message: NOT_A_STATEMENT }, line);
  }
});

test('a byte-order mark and CRLF line endings read in full', () => {
  const rows = readStatement(`﻿${HEADER}\r\n02/08/2026,Lowtide Grocers,5.80\r\n`);
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/statement.test.js`
Expected: FAIL with "Cannot find module" for `src/lib/statement.js`.

- [ ] **Step 3: Implement `readStatement` and `NOT_A_STATEMENT` in `src/lib/statement.js`**

Import `splitCsvLine` from `./csv.js`, and `parseDate` and `parseAmount` from `./dates.js` and `./money.js`. Follow the rules above in order. Refuse on the first bad line by throwing.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/statement.test.js tests/csv.test.js`
Expected: PASS. Then run `npm test`; the two existing tests in `tests/smoke.test.js` still pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/statement.js tests/statement.test.js
git commit -m "feat: read a bank statement into rows"
```

---

### Task 3: Create the feature switch file

**Files:**
- Create: `config/feature-flags.json`
- Test: `tests/feature-flags.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: a JSON object file with the key `"import-statement"` set to `true`. Nothing reads it in this slice; slice 3 reads it.

- [ ] **Step 1: Write the failing test**

```js
// tests/feature-flags.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('the import-statement switch is in the feature flags file and is on', () => {
  const flags = JSON.parse(fs.readFileSync(new URL('../config/feature-flags.json', import.meta.url), 'utf8'));
  assert.equal(flags['import-statement'], true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/feature-flags.test.js`
Expected: FAIL with ENOENT for `config/feature-flags.json`.

- [ ] **Step 3: Create `config/feature-flags.json`**

```json
{
  "import-statement": true
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/feature-flags.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add config/feature-flags.json tests/feature-flags.test.js
git commit -m "feat: add the import-statement feature switch"
```

