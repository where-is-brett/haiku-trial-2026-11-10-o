# Transaction categories by shop name Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking. Build task by task, in order.

**Goal:** Add `src/lib/categories.js`, which exports `CATEGORIES` and `categoryOf(description)`, so a transaction description maps to one of eight category keys by the shop name it contains.

**Architecture:** One pure module beside `money.js` and `dates.js`. `CATEGORIES` is the ordered key and label list. `categoryOf` walks an ordered shop table and returns the first shop whose name the lower-cased description contains, else `other`. Nothing else in the app changes.

**Tech Stack:** Node.js ES modules, `node:test` and `node:assert/strict` (as in `tests/smoke.test.js`). No new dependencies.

**Spec:** `.wheelhouse/feature/approved.md`

## Global Constraints

- Node `>=22.13`, ESM (`"type": "module"`), no new dependencies.
- Tests run with `npm test` (`node --test`).
- Category keys and labels are copied verbatim from the spec's Categories table, in its order.
- Shop matching is containment, ignoring case, by `String.prototype.includes`. No regular expressions, so punctuation in a shop name matches literally.
- Where two shop names both match, the one listed first in the spec's Shops table wins.
- Do not touch `parseAmount`, `parseDate`, `monthOf`, or the server.

## Review Focus

1. A description that is `null`, `undefined` or a number returns `other` and does not throw.
2. A blank or whitespace-only description returns `other`.
3. A description containing two shop names returns the category of the shop listed first in the spec's table.
4. A shop name inside a longer piece of text (`Ember Grillhouse`) matches its shop.
5. A shop name padded with surrounding spaces (`  Quillon Books  `) matches its shop.

Each line has its test in Task 2.

---

### Task 1: Category list

**Files:**
- Create: `src/lib/categories.js`
- Test: `tests/categories.test.js`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `export const CATEGORIES` — an array of `{ key, label }` objects, eight entries, in the spec's order. Task 2 reads it.

- [ ] **Step 1: Write the failing test**

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/categories.test.js`
Expected: FAIL with "Cannot find module" for `src/lib/categories.js`.

- [ ] **Step 3: Implement `CATEGORIES` in `src/lib/categories.js`**

Export the `CATEGORIES` array exactly as the test lists it. Add a one-line comment above it in the style of `money.js`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/categories.test.js`
Expected: PASS, 1 test.

- [ ] **Step 5: Commit**

```bash
git add src/lib/categories.js tests/categories.test.js
git commit -m "Add the transaction category list"
```

---

### Task 2: Categorise a description by shop name

**Files:**
- Modify: `src/lib/categories.js`
- Test: `tests/categories.test.js`

**Interfaces:**
- Consumes: `CATEGORIES` from Task 1 (the `other` key must be one of its entries).
- Produces: `export function categoryOf(description)` — takes a value (normally a string), returns a category key string: one of the eight keys in `CATEGORIES`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/categories.test.js`. The shop table below is the spec's Shops table, in its order.

```js
import { categoryOf } from '../src/lib/categories.js';

const SHOPS = [
  ['Greenbarrow Fresh', 'groceries'],
  ['Pennywhistle Market', 'groceries'],
  ['Lowtide Grocers', 'groceries'],
  ['Harvest Lane Foods', 'groceries'],
  ['Pasta, Pizza & Co', 'eating_out'],
  ['Kestrel Coffee Bar', 'eating_out'],
  ['Saltbush Noodle House', 'eating_out'],
  ['Ember Grill', 'eating_out'],
  ['Waverly Fuel Stop', 'transport'],
  ['Tramline Fares', 'transport'],
  ['Lantern Rideshare', 'transport'],
  ['Northgate Parking', 'transport'],
  ['Brightfield Power', 'bills'],
  ['Clearwater Utilities', 'bills'],
  ['Skyline Broadband', 'bills'],
  ['Hollis Insurance', 'bills'],
  ['Marlowe Homewares', 'shopping'],
  ['Quillon Books', 'shopping'],
  ['Fernhill Outfitters', 'shopping'],
  ['Pixel Parade Tech', 'shopping'],
  ['Larkspur Pharmacy', 'health'],
  ['Elmgrove Physio', 'health'],
  ['Cobalt Dental', 'health'],
  ['Sunnyvale Optical', 'health'],
  ['Brightwave Payroll', 'income'],
  ['Tidepool Interest', 'income'],
  ['Oakridge Dividends', 'income'],
];

test('every shop in the table maps to its category, in any case', () => {
  for (const [shop, key] of SHOPS) {
    assert.equal(categoryOf(shop), key, shop);
    assert.equal(categoryOf(shop.toUpperCase()), key, shop);
    assert.equal(categoryOf(shop.toLowerCase()), key, shop);
  }
});

test('a shop name inside a longer description still matches', () => {
  assert.equal(categoryOf(`POS PASTA, PIZZA & CO 0412`), 'eating_out');
  assert.equal(categoryOf('Ember Grillhouse'), 'eating_out');
});

test('a shop name padded with spaces matches', () => {
  assert.equal(categoryOf('  Quillon Books  '), 'shopping');
});

test('a description with no shop name is other', () => {
  assert.equal(categoryOf('Unknown Shop 123'), 'other');
});

test('a blank description is other', () => {
  assert.equal(categoryOf(''), 'other');
  assert.equal(categoryOf('   '), 'other');
});

test('a description that is not text is other and does not throw', () => {
  assert.equal(categoryOf(null), 'other');
  assert.equal(categoryOf(undefined), 'other');
  assert.equal(categoryOf(42), 'other');
});

test('when two shops match, the one listed first wins', () => {
  assert.equal(categoryOf('Greenbarrow Fresh and Ember Grill'), 'groceries');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/categories.test.js`
Expected: FAIL, `categoryOf` is not exported.

- [ ] **Step 3: Implement `categoryOf` in `src/lib/categories.js`**

Add a `SHOPS` array of `[name, key]` pairs in the spec's Shops order, using the same 27 rows as the test. Then `categoryOf(description)` lower-cases `String(description)`, finds the first `SHOPS` entry whose lower-cased name it contains with `includes`, and returns that key, or `'other'` when none matches. Use `find`, not a regular expression.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/categories.test.js`
Expected: PASS, 8 tests in this file.

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: PASS, the 2 existing tests and the 8 in this file, 0 failures.

- [ ] **Step 6: Commit**

```bash
git add src/lib/categories.js tests/categories.test.js
git commit -m "Sort transactions into categories by shop name"
```

---

## Self-review

- **Spec coverage:** Categories table → Task 1. Shops table and containment matching → Task 2. Interface (`CATEGORIES`, `categoryOf`) → Tasks 1 and 2. Done when: shops in any case (Task 2 test 1), no shop name → other (Task 2), CATEGORIES order (Task 1), `npm test` (Task 2 Step 5). Not-in-scope items are untouched.
- **Type consistency:** `CATEGORIES` entries are `{ key, label }`; `categoryOf` returns a key string from those keys. `SHOPS` in the implementation matches the test table row for row.
- **Review Focus:** each of the five lines has a test in Task 2.
