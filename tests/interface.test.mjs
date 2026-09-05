import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeSettings } from '../.test-build/settings/settings.js';

test('settings keep only Normal/Simulated styles and clamp per-style effects', () => {
  const settings = normalizeSettings({
    interfaceMode: 'simulated',
    fontScale: 9,
    styleEffects: {
      normal: { glow: -10, scanlines: 11, density: 140 },
      simulated: { runningScanline: 88, randomEventFrequency: 120, bezel: 44 }
    }
  });
  assert.equal(settings.interfaceMode, 'simulated');
  assert.equal(settings.fontScale, 1.5);
  assert.equal(settings.palette, 'green');
  assert.equal(settings.styleEffects.normal.glow, 0);
  assert.equal(settings.styleEffects.normal.scanlines, 11);
  assert.equal(settings.styleEffects.normal.density, 100);
  assert.equal(settings.styleEffects.simulated.runningScanline, 88);
  assert.equal(settings.styleEffects.simulated.randomEventFrequency, 100);
  assert.equal(settings.styleEffects.simulated.bezel, 44);
  assert.equal(normalizeSettings({ interfaceMode: 'legacy' }).interfaceMode, 'normal');
});

test('Simulated mode defines CRT glass, bezel, random sweep treatment, and remains palette-independent', () => {
  const css = fs.readFileSync(new URL('../public/style.css', import.meta.url), 'utf8');
  assert.match(css, /data-interface-mode='simulated'/);
  assert.match(css, /simulated[^}]*--fx-bezel/i);
  assert.match(css, /simulated[\s\S]*\.workstation-shell::before/);
  assert.match(css, /simulated[\s\S]*\.workstation-shell::after/);
  assert.match(css, /data-scanline-sweep-active='true'/);
  assert.doesNotMatch(css, /data-interface-mode='simulated'\]\s*\{[^}]*--text:/);
});

test('service-worker cache revision advances with visual assets', () => {
  const sw = fs.readFileSync(new URL('../public/service-worker.js', import.meta.url), 'utf8');
  assert.match(sw, /CACHE_VERSION = 'scp-reader-v4'/);
});
