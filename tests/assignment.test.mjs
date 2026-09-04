import test from 'node:test';
import assert from 'node:assert/strict';
import { completeObjective, createAssignmentState } from '../.test-build/assignments/runtime.js';

test('assignment objective completion is immutable', () => {
  const definition = { id: 'orientation', title: 'Orientation', objectives: [{ id: 'open-record', label: 'Open a record' }, { id: 'add-note', label: 'Add a note' }] };
  const state = createAssignmentState(definition);
  const next = completeObjective(state, 'open-record');
  assert.deepEqual(next.completedObjectiveIds, ['open-record']);
  assert.deepEqual(state.completedObjectiveIds, []);
});
