// tests/feature-flags.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('the import-statement switch is in the feature flags file and is on', () => {
  const flags = JSON.parse(fs.readFileSync(new URL('../config/feature-flags.json', import.meta.url), 'utf8'));
  assert.equal(flags['import-statement'], true);
});

test('the edit-category switch is in the feature flags file and is off until the pages are built', () => {
  const flags = JSON.parse(fs.readFileSync(new URL('../config/feature-flags.json', import.meta.url), 'utf8'));
  assert.equal(flags['edit-category'], false);
});
