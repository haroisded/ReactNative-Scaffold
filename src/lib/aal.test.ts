import assert from 'node:assert/strict';
import { test } from 'node:test';

import { needsMfa } from './aal.ts';

test('no enrolled factor: straight through', () => {
  assert.equal(needsMfa({ currentLevel: 'aal1', nextLevel: 'aal1' }), false);
});

test('factor enrolled but not yet verified on this session: stop at the code screen', () => {
  assert.equal(needsMfa({ currentLevel: 'aal1', nextLevel: 'aal2' }), true);
});

test('code already verified on this session: straight through', () => {
  assert.equal(needsMfa({ currentLevel: 'aal2', nextLevel: 'aal2' }), false);
});

test('signed out / unknown levels: no MFA gate', () => {
  assert.equal(needsMfa({ currentLevel: null, nextLevel: null }), false);
});
