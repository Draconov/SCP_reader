import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCommand } from '../.test-build/terminal/parser.js';

test('parses OPEN commands case-insensitively', () => {
  assert.deepEqual(parseCommand('open scp-049'), { name: 'OPEN', args: ['scp-049'] });
});

test('preserves multi-word FIND queries', () => {
  assert.deepEqual(parseCommand('FIND biological euclid'), { name: 'FIND', args: ['biological', 'euclid'] });
});

test('returns UNKNOWN for empty input', () => {
  assert.deepEqual(parseCommand('   '), { name: 'UNKNOWN', args: [] });
});
