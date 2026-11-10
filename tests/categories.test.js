// tests/categories.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES, categoryOf } from '../src/lib/categories.js';

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
  assert.equal(categoryOf('POS PASTA, PIZZA & CO 0412'), 'eating_out');
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
