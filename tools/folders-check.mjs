// Self-check for src/features/products/folders.ts: `node tools/folders-check.mjs`. Node strips the types.
import assert from 'node:assert/strict';

import { folderEntries, folderTrail } from '../src/features/products/folders.ts';

const rows = [
  { id: 'gauze5', category: 'supplies', sub: null, group: 'gauze' },
  { id: 'gauze10', category: 'supplies', sub: null, group: 'gauze' },
  { id: 'tape', category: 'supplies', sub: null, group: null },
  { id: 'para', category: 'meds', sub: 'tabs', group: null },
  { id: 'loose', category: null, sub: null, group: null },
  { id: 'cup-s', category: null, sub: null, group: 'cups' },
];
const named = [
  { id: 'supplies', name: 'Supplies' },
  { id: 'meds', name: 'Medicines' },
  { id: 'tabs', name: 'Tablets' },
  { id: 'gauze', name: 'Gauze' },
  { id: 'cups', name: 'Cups' },
];
const place = (row) => ({ category: row.category, sub: row.sub, group: row.group });
const show = (path) =>
  folderEntries(rows, place, path, named).map((entry) => (entry.kind === 'folder' ? `${entry.name}/${entry.count}` : entry.item.id));

assert.deepEqual(show({}), ['Medicines/1', 'Supplies/3', 'Cups/1', 'loose']);
assert.deepEqual(show({ category: 'supplies' }), ['Gauze/2', 'tape']);
assert.deepEqual(show({ category: 'supplies', group: 'gauze' }), ['gauze5', 'gauze10']);
assert.deepEqual(show({ category: 'meds' }), ['Tablets/1']);
assert.deepEqual(show({ category: 'meds', sub: 'tabs' }), ['para']);
assert.deepEqual(show({ group: 'cups' }), ['cup-s']);
assert.deepEqual(folderTrail({ category: 'meds', sub: 'tabs' }, named), ['Medicines', 'Tablets']);
console.log('folders: ok');
