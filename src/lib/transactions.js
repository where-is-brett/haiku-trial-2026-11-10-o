// src/lib/transactions.js

import { CATEGORIES, categoryOf } from './categories.js';

// The keys a manual category can be. Anything else is refused before it reaches the database.
const KEYS = new Set(CATEGORIES.map((category) => category.key));

// Adds the nullable category column to transactions when the table does not have it yet.
export function addCategoryColumn(db) {
  const columns = db.prepare('PRAGMA table_info(transactions)').all();
  if (columns.some((column) => column.name === 'category')) return;
  db.exec('ALTER TABLE transactions ADD COLUMN category TEXT');
}

// Returns the transaction with this id, or null. The category is null when no manual choice is stored.
export function findTransaction(db, id) {
  const row = db
    .prepare('SELECT id, date, description, cents, category FROM transactions WHERE id = ?')
    .get(id);
  if (!row) return null;
  return {
    id: row.id,
    date: row.date,
    description: row.description,
    cents: row.cents,
    category: row.category ?? null,
  };
}

// Stores a manual category for a transaction. Saving the category the shop rule already gives
// stores null, so the row keeps following the shop rules. Returns false when no row has this id.
export function setCategory(db, id, key) {
  if (!KEYS.has(key)) throw new RangeError('unknown category key');
  const row = db.prepare('SELECT description FROM transactions WHERE id = ?').get(id);
  if (!row) return false;
  const stored = key === categoryOf(row.description) ? null : key;
  db.prepare('UPDATE transactions SET category = ? WHERE id = ?').run(stored, id);
  return true;
}
