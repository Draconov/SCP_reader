import test from 'node:test';
import assert from 'node:assert/strict';
import { isReaderCacheName, networkStatusLabel } from '../.test-build/offline/status.js';

test('recognizes only SCP Reader managed cache names', () => {
  assert.equal(isReaderCacheName('scp-reader-v3'), true);
  assert.equal(isReaderCacheName('other-app-v1'), false);
});

test('network label distinguishes online and local archive modes', () => {
  assert.equal(networkStatusLabel(true), 'NETWORK: ONLINE');
  assert.equal(networkStatusLabel(false), 'NETWORK: OFFLINE / LOCAL ARCHIVE MODE');
});
