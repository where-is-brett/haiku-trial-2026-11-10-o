// src/lib/csv.js

// Reads one CSV line as an array of fields, or returns null when the line is
// malformed: a quote that never closes, or text between a closing quote and the
// next comma or the end of the line.
export function splitCsvLine(line) {
  const fields = [];
  let i = 0;
  for (;;) {
    while (line[i] === ' ') i++;
    let value;
    if (line[i] === '"') {
      // Quoted field: runs to the closing quote; "" inside is one literal quote.
      i++;
      value = '';
      for (;;) {
        if (i >= line.length) return null;
        if (line[i] === '"') {
          if (line[i + 1] === '"') {
            value += '"';
            i += 2;
          } else {
            i++;
            break;
          }
        } else {
          value += line[i];
          i++;
        }
      }
      while (line[i] === ' ') i++;
      if (i < line.length && line[i] !== ',') return null;
    } else {
      // Unquoted field: up to the next comma, trimmed of spaces; a quote is literal.
      const comma = line.indexOf(',', i);
      const stop = comma === -1 ? line.length : comma;
      value = line.slice(i, stop).replace(/^ +| +$/g, '');
      i = stop;
    }
    fields.push(value);
    if (i >= line.length) return fields;
    i++; // skip the comma that separates this field from the next
  }
}
