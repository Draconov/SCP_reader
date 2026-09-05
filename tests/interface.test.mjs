import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { isSimulatedDynamicEffectEnabled, normalizeSettings } from '../.test-build/settings/settings.js';

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

test('Simulated mode defines CRT glass and bezel treatment while remaining palette-independent', () => {
  const css = fs.readFileSync(new URL('../public/style.css', import.meta.url), 'utf8');
  assert.match(css, /data-interface-mode='simulated'/);
  assert.match(css, /simulated[^}]*--fx-bezel/i);
  assert.match(css, /simulated[\s\S]*\.workstation-shell::before/);
  assert.match(css, /simulated[\s\S]*\.workstation-shell::after/);
  assert.doesNotMatch(css, /data-interface-mode='simulated'\]\s*\{[^}]*--text:/);
});

test('every adjustable CRT overlay actually consumes its intensity variable', () => {
  const css = fs.readFileSync(new URL('../public/style.css', import.meta.url), 'utf8');
  const app = fs.readFileSync(new URL('../src/app/App.ts', import.meta.url), 'utf8');
  assert.match(app, /crt-scanlines/);
  assert.match(app, /crt-noise/);
  assert.match(app, /crt-scanline-sweep/);
  assert.match(css, /crt-scanlines[\s\S]*var\(--fx-scanlines\)/);
  assert.match(css, /crt-noise[\s\S]*var\(--fx-noise\)/);
  assert.match(css, /crt-scanline-sweep[\s\S]*var\(--fx-running-scanline\)/);
});

test('reflection and vignette intensity can reach a true zero', () => {
  const css = fs.readFileSync(new URL('../public/style.css', import.meta.url), 'utf8');
  assert.match(css, /workstation-shell::before\s*\{[\s\S]*?opacity:calc\(var\(--fx-reflection\)\s*\*/);
  assert.match(css, /workstation-shell::after\s*\{[\s\S]*?opacity:calc\(var\(--fx-vignette\)\s*\*/);
  assert.doesNotMatch(css, /opacity:calc\([^)]*\+\s*var\(--fx-(?:reflection|vignette)\)/);
});

test('CRT glow and bezel controls do not keep a built-in effect at zero', () => {
  const css = fs.readFileSync(new URL('../public/style.css', import.meta.url), 'utf8');
  const simulated = css.slice(css.indexOf(":root[data-interface-mode='simulated'] body"), css.indexOf('@media (max-width: 760px)'));
  assert.doesNotMatch(simulated, /calc\(\d+px\s*\+\s*var\(--fx-glow\)/);
  assert.doesNotMatch(simulated, /calc\(\d+px\s*\+\s*var\(--fx-vignette\)/);
  assert.match(simulated, /border:calc\(var\(--fx-bezel\)\s*\*/);
});

test('running CRT scanline travels completely from above to below the glass', () => {
  const css = fs.readFileSync(new URL('../public/style.css', import.meta.url), 'utf8');
  assert.match(css, /@keyframes simulated-scanline\s*\{[\s\S]*from\s*\{\s*top:\s*-[1-9]\d*%[\s\S]*to\s*\{\s*top:\s*(?:10[1-9]|1[1-9]\d)%/);
  assert.doesNotMatch(css, /@keyframes simulated-scanline[\s\S]{0,240}background-position/);
});

test('flicker is random-event driven rather than a fixed periodic animation', () => {
  const css = fs.readFileSync(new URL('../public/style.css', import.meta.url), 'utf8');
  assert.doesNotMatch(css, /data-has-flicker='true'[^}]*animation\s*:\s*flicker/i);
  assert.doesNotMatch(css, /@keyframes\s+flicker/i);
  assert.match(css, /data-random-flicker-active='true'/);
});

test('dynamic CRT effects stop when Simulated mode or motion permission is no longer active', () => {
  const settings = normalizeSettings({ interfaceMode: 'simulated' });
  assert.equal(isSimulatedDynamicEffectEnabled(settings, 'flicker'), true);
  assert.equal(isSimulatedDynamicEffectEnabled(settings, 'runningScanline'), true);
  assert.equal(isSimulatedDynamicEffectEnabled(normalizeSettings({ ...settings, interfaceMode: 'normal' }), 'flicker'), false);
  assert.equal(isSimulatedDynamicEffectEnabled(normalizeSettings({ ...settings, reduceMotion: true }), 'runningScanline'), false);
  assert.equal(isSimulatedDynamicEffectEnabled(normalizeSettings({ ...settings, styleEffects: { ...settings.styleEffects, simulated: { ...settings.styleEffects.simulated, randomEventFrequency: 0 } } }), 'flicker'), false);
  const app = fs.readFileSync(new URL('../src/app/App.ts', import.meta.url), 'utf8');
  assert.match(app, /isSimulatedDynamicEffectEnabled/);
});

test('Simulated content surfaces derive from the active palette instead of fixed green-black values', () => {
  const css = fs.readFileSync(new URL('../public/style.css', import.meta.url), 'utf8');
  const simulated = css.slice(css.indexOf(":root[data-interface-mode='simulated'] body"), css.indexOf('@media (max-width: 760px)'));
  for (const fixedGreen of ['#010a04ee', '#010603', '#010302', 'rgba(0, 13, 5, .62)', 'rgba(0,7,3,.68)', 'rgba(64,255,98,.025)', '#071409']) {
    assert.equal(simulated.includes(fixedGreen), false, `Simulated CSS still contains fixed green surface ${fixedGreen}`);
  }
});

test('service-worker cache revision advances with visual assets', () => {
  const sw = fs.readFileSync(new URL('../public/service-worker.js', import.meta.url), 'utf8');
  assert.match(sw, /CACHE_VERSION = 'scp-reader-v7'/);
  assert.match(sw, /scp-foundation-mark-mask\.png/);
});

test('credential gates use the official Foundation mark on the right and tint it from the active palette', () => {
  const app = fs.readFileSync(new URL('../src/app/App.ts', import.meta.url), 'utf8');
  const css = fs.readFileSync(new URL('../public/style.css', import.meta.url), 'utf8');
  assert.match(app, /credential-header/);
  assert.match(app, /foundation-logo-mark/);
  assert.doesNotMatch(app, /el\('div', 'foundation-mark', 'SCP'\)/);
  assert.match(css, /\.credential-header\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) auto/s);
  assert.match(css, /foundation-logo-mark::before[\s\S]*background:\s*var\(--accent\)/);
  assert.match(css, /scp-foundation-mark-mask\.png/);
  assert.match(css, /\.foundation-mark\s*\{[^}]*justify-self:\s*end/s);
  assert.match(css, /\.foundation-mark\s*\{[^}]*width:\s*clamp\([^,]+,[^,]+,\s*(?:9\d|100)px\)/s);
  const logoBlock = css.match(/\.foundation-logo-mark\s*\{([^}]*)\}/s)?.[1] ?? '';
  assert.doesNotMatch(logoBlock, /border\s*:/);
  assert.doesNotMatch(logoBlock, /background\s*:/);
  assert.doesNotMatch(logoBlock, /box-shadow\s*:/);
  assert.match(css, /foundation-logo-mark::before[\s\S]*filter:\s*drop-shadow/);
  assert.match(css, /data-interface-mode='simulated'[\s\S]*foundation-logo-mark::before[^}]*var\(--fx-glow\)/);
  assert.ok(fs.existsSync(new URL('../public/scp-foundation-mark-mask.png', import.meta.url)));
});

test('workstation is viewport-bound and scrollable views never expose browser scrollbars', () => {
  const css = fs.readFileSync(new URL('../public/style.css', import.meta.url), 'utf8');
  assert.match(css, /html, body, #root\s*\{[^}]*height:\s*100%[^}]*overflow:\s*hidden/s);
  assert.match(css, /\.workstation-shell\s*\{[^}]*height:\s*100dvh[^}]*min-height:\s*0/s);
  assert.match(css, /\.workspace\s*\{[^}]*min-height:\s*0[^}]*overflow:\s*hidden/s);
  assert.match(css, /\.main-window\s*\{[^}]*min-height:\s*0[^}]*overflow:\s*auto/s);
  assert.match(css, /scrollbar-width:\s*none/);
  assert.match(css, /::-webkit-scrollbar\s*\{[^}]*display:\s*none/s);
  assert.match(css, /data-interface-mode='simulated'[^}]*\.workstation-shell[\s\S]*height:\s*calc\(100dvh - 52px\)/);
});

test('all range controls use the Foundation terminal slider skin instead of native browser chrome', () => {
  const css = fs.readFileSync(new URL('../public/style.css', import.meta.url), 'utf8');
  const app = fs.readFileSync(new URL('../src/app/App.ts', import.meta.url), 'utf8');
  assert.match(css, /input\[type=['"]range['"]\]\s*\{[^}]*appearance:\s*none/s);
  assert.match(css, /input\[type=['"]range['"]\]::-webkit-slider-thumb[\s\S]*background:\s*var\(--accent\)/);
  assert.match(css, /input\[type=['"]range['"]\]::-moz-range-thumb[\s\S]*background:\s*var\(--accent\)/);
  assert.match(css, /--range-progress/);
  assert.match(app, /syncRangeVisual/);
});

test('running scanline has its own underlay below workstation UI while fine CRT overlays remain above it', () => {
  const css = fs.readFileSync(new URL('../public/style.css', import.meta.url), 'utf8');
  const app = fs.readFileSync(new URL('../src/app/App.ts', import.meta.url), 'utf8');
  assert.match(app, /crt-scanline-underlay/);
  assert.match(app, /crt-scanline-underlay[\s\S]*crt-scanline-sweep/);
  assert.doesNotMatch(app, /crtEffects\.append\([^;]*crt-scanline-sweep/);
  assert.match(css, /\.crt-scanline-underlay\s*\{[^}]*z-index:\s*0/s);
  assert.match(css, /\.topbar,[\s\S]*\.workspace,[\s\S]*\.statusbar\s*\{[^}]*z-index:\s*1/s);
  assert.match(css, /\.crt-effects\s*\{[^}]*z-index:\s*[2-9]\d*/s);
});