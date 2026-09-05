import test from 'node:test';
import assert from 'node:assert/strict';
import { completeObjective, createAssignmentState } from '../.test-build/assignments/runtime.js';
import { issueProfile, parseProfile, serializeProfile } from '../.test-build/researcher/profile.js';

test('issues a level 1 research assistant with a personnel ID', () => {
  const profile = issueProfile('Dr. Test');
  assert.equal(profile.researcher.displayName, 'Dr. Test');
  assert.match(profile.researcher.personnelId, /^R-\d{5}$/);
  assert.equal(profile.researcher.rank, 'Research Assistant');
  assert.equal(profile.researcher.clearance, 1);
});

test('profile round-trips through the .scp-id JSON representation', () => {
  const profile = issueProfile('Dr. Test');
  assert.deepEqual(parseProfile(serializeProfile(profile)), profile);
});

test('profile parser rejects malformed career data', () => {
  assert.throws(() => parseProfile('{"formatVersion":1}'), /Invalid SCP ID profile/);
});

test('assignment objective completion returns a new state without mutating the original', () => {
  const definition = { id: 'orientation', title: 'Orientation', objectives: [{ id: 'open-record', label: 'Open a record' }, { id: 'add-note', label: 'Add a note' }] };
  const state = createAssignmentState(definition);
  const next = completeObjective(state, 'open-record');
  assert.deepEqual(next.completedObjectiveIds, ['open-record']);
  assert.deepEqual(state.completedObjectiveIds, []);
});
