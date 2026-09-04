import test from 'node:test';
import assert from 'node:assert/strict';
import { authStepDelay, buildAuthSequence } from '../.test-build/app/immersion.js';

const profile = {
  researcher: { personnelId: 'R-12345', displayName: 'Dr. Test', rank: 'Research Assistant', clearance: 1 }
};

test('low immersion skips authentication ceremony', () => {
  assert.deepEqual(buildAuthSequence(profile, 'low'), []);
  assert.equal(authStepDelay('low'), 0);
});

test('standard authentication names the credential and grants access', () => {
  const lines = buildAuthSequence(profile, 'standard');
  assert.ok(lines.some((line) => line.includes('R-12345')));
  assert.equal(lines.at(-1), 'ACCESS GRANTED');
  assert.ok(authStepDelay('standard') > 0);
});

test('full authentication adds archive and security checks', () => {
  const standard = buildAuthSequence(profile, 'standard');
  const full = buildAuthSequence(profile, 'full');
  assert.ok(full.length > standard.length);
  assert.ok(full.some((line) => line.includes('SECURITY AUDIT')));
  assert.equal(full.at(-1), 'ACCESS GRANTED');
});
