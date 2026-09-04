import test from 'node:test';
import assert from 'node:assert/strict';
import { issueProfile, parseProfile, serializeProfile } from '../.test-build/researcher/profile.js';

test('issues a level 1 research assistant with a personnel ID', () => {
  const profile = issueProfile('Dr. Test');
  assert.equal(profile.researcher.displayName, 'Dr. Test');
  assert.match(profile.researcher.personnelId, /^R-\d{5}$/);
  assert.equal(profile.researcher.rank, 'Research Assistant');
  assert.equal(profile.researcher.clearance, 1);
});

test('round-trips through the .scp-id JSON representation', () => {
  const profile = issueProfile('Dr. Test');
  assert.deepEqual(parseProfile(serializeProfile(profile)), profile);
});

test('rejects malformed profile data', () => {
  assert.throws(() => parseProfile('{"formatVersion":1}'), /Invalid SCP ID profile/);
});
