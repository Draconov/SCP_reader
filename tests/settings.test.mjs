import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSettings } from '../.test-build/settings/settings.js';

test('settings normalizer clamps font scale, keeps only normal/simulated styles, and normalizes per-style effects', () => {
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
});

test('unsupported legacy interface styles are rejected in favor of Normal', () => {
  const settings = normalizeSettings({ interfaceMode: 'legacy' });
  assert.equal(settings.interfaceMode, 'normal');
});
