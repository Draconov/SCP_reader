import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeSettings } from '../.test-build/settings/settings.js';

test('settings normalizer preserves the Simulated interface mode', () => {
  const settings = normalizeSettings({ interfaceMode: 'simulated' });
  assert.equal(settings.interfaceMode, 'simulated');
});

test('Simulated mode defines dedicated CRT glass, bezel, and scanline sweep treatment without hardcoding a palette', () => {
  const css = fs.readFileSync(new URL('../public/style.css', import.meta.url), 'utf8');
  assert.match(css, /data-interface-mode='simulated'/);
  assert.match(css, /simulated[^}]*--fx-bezel/i);
  assert.match(css, /simulated[\s\S]*\.workstation-shell::before/);
  assert.match(css, /simulated[\s\S]*\.workstation-shell::after/);
  assert.match(css, /data-scanline-sweep-active='true'/);
  assert.doesNotMatch(css, /data-interface-mode='simulated'\]\s*\{[^}]*--text:/);
});

test('visual release advances the service-worker cache so existing installs receive the new CSS and JS', () => {
  const sw = fs.readFileSync(new URL('../public/service-worker.js', import.meta.url), 'utf8');
  assert.match(sw, /CACHE_VERSION = 'scp-reader-v4'/);
});
