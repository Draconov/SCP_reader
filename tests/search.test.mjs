import test from 'node:test';
import assert from 'node:assert/strict';
import { searchArchive } from '../.test-build/archive/search.js';

const entries = [
  { id: 'en:scp-049', branch: 'en', slug: 'scp-049', title: 'SCP-049', type: 'scp', summary: 'Humanoid plague doctor anomaly', tags: ['euclid', 'humanoid', 'biological'], clearance: 1, renderer: 'foundation-document' },
  { id: 'en:scp-682', branch: 'en', slug: 'scp-682', title: 'SCP-682', type: 'scp', summary: 'Highly adaptive reptile', tags: ['keter', 'reptile'], clearance: 2, renderer: 'foundation-document' }
];

test('archive search finds number, summary, and tags', () => {
  assert.equal(searchArchive(entries, '049')[0]?.id, 'en:scp-049');
  assert.equal(searchArchive(entries, 'biological')[0]?.id, 'en:scp-049');
  assert.equal(searchArchive(entries, 'adaptive')[0]?.id, 'en:scp-682');
});

test('archive search returns all entries for empty query', () => {
  assert.equal(searchArchive(entries, '').length, 2);
});
