// src/lib/statement.js
import { splitCsvLine } from './csv.js';
import { parseDate } from './dates.js';
import { parseAmount } from './money.js';

// The plain error text for a file that is not a bank statement.
export const NOT_A_STATEMENT =
  "This file isn't a bank statement with Date, Description and Amount columns.";

const HEADER = 'Date,Description,Amount';

// Reads a bank statement CSV into rows, in file order. Throws NOT_A_STATEMENT
// on the first line that does not fit the statement layout.
export function readStatement(text) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/);
  if (lines[0].trim() !== HEADER) throw new Error(NOT_A_STATEMENT);

  const rows = [];
  for (const line of lines.slice(1)) {
    if (line.trim() === '') continue;
    const fields = splitCsvLine(line);
    if (fields === null || fields.length !== 3) throw new Error(NOT_A_STATEMENT);
    const [date, description, amount] = fields;
    rows.push({
      date: readDate(date),
      description: description.trim(),
      cents: readCents(amount),
    });
  }
  return rows;
}

// Returns the ISO date for a dd/mm/yyyy field that is a real calendar day.
function readDate(field) {
  const text = field.trim();
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!match) throw new Error(NOT_A_STATEMENT);
  const [day, month, year] = match.slice(1).map(Number);
  const real = new Date(Date.UTC(year, month - 1, day));
  if (
    real.getUTCDate() !== day ||
    real.getUTCMonth() !== month - 1 ||
    real.getUTCFullYear() !== year
  ) {
    throw new Error(NOT_A_STATEMENT);
  }
  return parseDate(text);
}

// Returns whole cents for an amount: brackets or a leading minus mean money
// coming back. Zero is never negative. Commas are allowed only as thousands
// separators in groups of three, such as 1,234.00.
function readCents(field) {
  let text = field.trim();
  let negative = false;
  if (text.startsWith('(') && text.endsWith(')')) {
    negative = true;
    text = text.slice(1, -1);
  } else if (text.startsWith('-')) {
    negative = true;
    text = text.slice(1);
  }
  if (!/^(\d{1,3}(,\d{3})+|\d+)(\.\d+)?$/.test(text)) throw new Error(NOT_A_STATEMENT);
  const cents = parseAmount(text.replace(/,/g, ''));
  return negative && cents !== 0 ? -cents : cents;
}
