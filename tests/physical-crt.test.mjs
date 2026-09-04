import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeSettings } from '../.test-build/settings/settings.js';

test('settings normalizer preserves the Physical CRT interface mode', () => {
  const settings = normalizeSettings({ interfaceMode: 'physical-crt' });
  assert.equal(settings.interfaceMode, 'physical-crt');
});

test('Physical CRT mode defines a dedicated glass and bezel treatment', () => {
  const css = fs.readFileSync(new URL('../public/style.css', import.meta.url), 'utf8');
  assert.match(css, /data-interface-mode='physical-crt'/);
  assert.match(css, /physical-crt[^}]*--crt-bezel/i);
  assert.match(css, /physical-crt[\s\S]*\.workstation-shell::before/);
  assert.match(css, /physical-crt[\s\S]*\.workstation-shell::after/);
});

test('visual release advances the service-worker cache so existing installs receive the new CSS', () => {
  const sw = fs.readFileSync(new URL('../public/service-worker.js', import.meta.url), 'utf8');
  assert.match(sw, /CACHE_VERSION = 'scp-reader-v2'/);
});
