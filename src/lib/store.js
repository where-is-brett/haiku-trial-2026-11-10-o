// src/lib/store.js
// The transactions table, the same statement src/server.js runs at start.
export const TRANSACTIONS_SQL =
  'CREATE TABLE IF NOT EXISTS transactions (id INTEGER PRIMARY KEY, date TEXT, description TEXT, cents INTEGER)';

// Stores the rows of one upload and skips the ones already stored. A row is
// skipped when fewer stored rows share its date, description and cents than
// this upload has seen so far with that key, so one stored copy matches one
// line of the upload. Returns how many rows were added and how many skipped.
export function storeRows(db, rows) {
  db.exec(TRANSACTIONS_SQL);
  const countStored = db.prepare(
    'SELECT COUNT(*) AS n FROM transactions WHERE date = ? AND description = ? AND cents = ?',
  );
  const insert = db.prepare('INSERT INTO transactions (date, description, cents) VALUES (?, ?, ?)');

  const seen = new Map();
  let added = 0;
  let skipped = 0;
  for (const { date, description, cents } of rows) {
    const key = JSON.stringify([date, description, cents]);
    const k = seen.get(key) ?? 0;
    seen.set(key, k + 1);

    const stored = countStored.get(date, description, cents).n;
    if (k < stored) {
      skipped += 1;
    } else {
      insert.run(date, description, cents);
      added += 1;
    }
  }
  return { added, skipped };
}
