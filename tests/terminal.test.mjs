import test from 'node:test';
import assert from 'node:assert/strict';
import { executeCommand } from '../.test-build/terminal/commands.js';
import { parseCommand } from '../.test-build/terminal/parser.js';
import { issueProfile } from '../.test-build/researcher/profile.js';
import { archiveEntries } from './fixtures.mjs';

test('parser handles OPEN commands case-insensitively', () => {
  assert.deepEqual(parseCommand('open scp-049'), { name: 'OPEN', args: ['scp-049'] });
});

test('parser preserves multi-word FIND queries and rejects empty input', () => {
  assert.deepEqual(parseCommand('FIND biological euclid'), { name: 'FIND', args: ['biological', 'euclid'] });
  assert.deepEqual(parseCommand('   '), { name: 'UNKNOWN', args: [] });
});

test('SOURCE prints the canonical wiki URL', () => {
  const result = executeCommand({ name: 'SOURCE', args: ['scp-049'] }, issueProfile('Test'), archiveEntries);
  assert.deepEqual(result.output, ['SOURCE: https://scp-wiki.wikidot.com/scp-049']);
});

test('RELATED requests relationship lookup for a known record', () => {
  const result = executeCommand({ name: 'RELATED', args: ['scp-049'] }, issueProfile('Test'), archiveEntries);
  assert.equal(result.action?.type, 'related-records');
  assert.equal(result.action?.id, 'en:scp-049');
});

test('BOOKMARKS opens the bookmarks view when records exist', () => {
  const profile = issueProfile('Test');
  profile.bookmarks = ['en:scp-049'];
  const result = executeCommand({ name: 'BOOKMARKS', args: [] }, profile, archiveEntries);
  assert.equal(result.action?.type, 'show-view');
  assert.equal(result.action?.view, 'bookmarks');
});
