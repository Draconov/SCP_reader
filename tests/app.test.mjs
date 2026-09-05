import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { authStepDelay, buildAuthSequence } from '../.test-build/app/immersion.js';
import { resolveShortcut } from '../.test-build/app/shortcuts.js';
import { isReaderCacheName, networkStatusLabel } from '../.test-build/offline/status.js';
import { authProfile } from './fixtures.mjs';

test('low immersion skips authentication ceremony', () => {
  assert.deepEqual(buildAuthSequence(authProfile, 'low'), []);
  assert.equal(authStepDelay('low'), 0);
});

test('standard authentication identifies the credential and grants access', () => {
  const lines = buildAuthSequence(authProfile, 'standard');
  assert.ok(lines.some((line) => line.includes('R-12345')));
  assert.equal(lines.at(-1), 'ACCESS GRANTED');
  assert.ok(authStepDelay('standard') > 0);
});

test('full authentication adds archive and security checks', () => {
  const standard = buildAuthSequence(authProfile, 'standard');
  const full = buildAuthSequence(authProfile, 'full');
  assert.ok(full.length > standard.length);
  assert.ok(full.some((line) => line.includes('SECURITY AUDIT')));
  assert.equal(full.at(-1), 'ACCESS GRANTED');
});

test('global researcher shortcuts map core views without stealing normal text input', () => {
  assert.equal(resolveShortcut({ key: 'k', ctrlKey: true, shiftKey: false, altKey: false, metaKey: false, editable: false }), 'archive-search');
  assert.equal(resolveShortcut({ key: 'P', ctrlKey: true, shiftKey: true, altKey: false, metaKey: false, editable: false }), 'terminal');
  assert.equal(resolveShortcut({ key: ',', ctrlKey: true, shiftKey: false, altKey: false, metaKey: false, editable: false }), 'settings');
  assert.equal(resolveShortcut({ key: 'm', ctrlKey: true, shiftKey: false, altKey: false, metaKey: false, editable: true }), null);
});

test('offline helpers recognize reader caches and label network state', () => {
  assert.equal(isReaderCacheName('scp-reader-v4'), true);
  assert.equal(isReaderCacheName('other-app-v1'), false);
  assert.equal(networkStatusLabel(true), 'NETWORK: ONLINE');
  assert.equal(networkStatusLabel(false), 'NETWORK: OFFLINE / LOCAL ARCHIVE MODE');
});

test('access denied panel stays fully in-universe', () => {
  const source = fs.readFileSync(new URL('../src/app/App.ts', import.meta.url), 'utf8');
  assert.match(source, /CURRENT CREDENTIAL: LEVEL/);
  assert.doesNotMatch(source, /This simulated clearance requirement is generated|not canonical SCP Wiki metadata/i);
});
