import test from 'node:test';
import assert from 'node:assert/strict';
import { executeCommand } from '../.test-build/terminal/commands.js';
import { issueProfile } from '../.test-build/researcher/profile.js';

const archive = [{
  id: 'en:scp-049', branch: 'en', slug: 'scp-049', title: 'SCP-049', type: 'scp',
  summary: 'Plague Doctor', tags: ['euclid'], clearance: 1, renderer: 'foundation-document'
}];

test('SOURCE prints the canonical wiki URL', () => {
  const result = executeCommand({ name: 'SOURCE', args: ['scp-049'] }, issueProfile('Test'), archive);
  assert.deepEqual(result.output, ['SOURCE: https://scp-wiki.wikidot.com/scp-049']);
});

test('RELATED requests relationship lookup for a known record', () => {
  const result = executeCommand({ name: 'RELATED', args: ['scp-049'] }, issueProfile('Test'), archive);
  assert.equal(result.action?.type, 'related-records');
  assert.equal(result.action?.id, 'en:scp-049');
});

test('BOOKMARKS opens the bookmarks view when records exist', () => {
  const profile = issueProfile('Test');
  profile.bookmarks = ['en:scp-049'];
  const result = executeCommand({ name: 'BOOKMARKS', args: [] }, profile, archive);
  assert.equal(result.action?.type, 'show-view');
  assert.equal(result.action?.view, 'bookmarks');
});
