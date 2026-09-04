import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSettings } from '../.test-build/settings/settings.js';

test('settings normalizer clamps font scale and preserves supported interface choices', () => {
  const settings = normalizeSettings({ interfaceMode: 'legacy', fontScale: 9, flicker: true });
  assert.equal(settings.interfaceMode, 'legacy');
  assert.equal(settings.fontScale, 1.5);
  assert.equal(settings.flicker, true);
  assert.equal(settings.palette, 'green');
});
