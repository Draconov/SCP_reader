import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveShortcut } from '../.test-build/app/shortcuts.js';

test('maps global researcher shortcuts', () => {
  assert.equal(resolveShortcut({ key: 'k', ctrlKey: true, shiftKey: false, altKey: false, metaKey: false, editable: false }), 'archive-search');
  assert.equal(resolveShortcut({ key: 'P', ctrlKey: true, shiftKey: true, altKey: false, metaKey: false, editable: false }), 'terminal');
  assert.equal(resolveShortcut({ key: ',', ctrlKey: true, shiftKey: false, altKey: false, metaKey: false, editable: false }), 'settings');
});

test('does not steal normal typing from text fields', () => {
  assert.equal(resolveShortcut({ key: 'm', ctrlKey: true, shiftKey: false, altKey: false, metaKey: false, editable: true }), null);
});
