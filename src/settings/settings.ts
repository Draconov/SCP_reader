import { DEFAULT_SETTINGS } from '../shared/constants.js';
import type { ImmersionLevel, InterfaceMode, PaletteName, ResearcherSettings, StyleEffectSettings } from '../shared/types.js';

const interfaceModes: InterfaceMode[] = ['normal', 'simulated'];
const immersionLevels: ImmersionLevel[] = ['low', 'standard', 'full'];
const palettes: PaletteName[] = ['green', 'amber', 'cold', 'blue', 'high-contrast'];
const effectKeys: Array<keyof StyleEffectSettings> = [
  'glow',
  'scanlines',
  'curvature',
  'flicker',
  'vignette',
  'noise',
  'reflection',
  'bezel',
  'runningScanline',
  'runningScanlineSpeed',
  'randomEventFrequency',
  'density'
];

function clampPercent(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(100, Math.round(value)))
    : fallback;
}

function normalizeStyleEffects(input: Partial<StyleEffectSettings> | undefined, fallback: StyleEffectSettings): StyleEffectSettings {
  const source = input ?? {};
  const output = { ...fallback };
  for (const key of effectKeys) output[key] = clampPercent(source[key], fallback[key]);
  return output;
}

export function getStyleEffects(settings: ResearcherSettings, mode = settings.interfaceMode): StyleEffectSettings {
  return settings.styleEffects[mode] ?? DEFAULT_SETTINGS.styleEffects[mode];
}

export function normalizeSettings(input: Partial<ResearcherSettings>): ResearcherSettings {
  const fontScale = typeof input.fontScale === 'number' && Number.isFinite(input.fontScale)
    ? Math.min(1.5, Math.max(0.8, input.fontScale))
    : DEFAULT_SETTINGS.fontScale;
  const styleEffects = {
    normal: normalizeStyleEffects(input.styleEffects?.normal, DEFAULT_SETTINGS.styleEffects.normal),
    simulated: normalizeStyleEffects(input.styleEffects?.simulated, DEFAULT_SETTINGS.styleEffects.simulated)
  };
  return {
    ...DEFAULT_SETTINGS,
    ...input,
    styleEffects,
    interfaceMode: interfaceModes.includes(input.interfaceMode as InterfaceMode) ? input.interfaceMode as InterfaceMode : DEFAULT_SETTINGS.interfaceMode,
    immersion: immersionLevels.includes(input.immersion as ImmersionLevel) ? input.immersion as ImmersionLevel : DEFAULT_SETTINGS.immersion,
    palette: palettes.includes(input.palette as PaletteName) ? input.palette as PaletteName : DEFAULT_SETTINGS.palette,
    fontScale,
    reduceMotion: Boolean(input.reduceMotion),
    sound: input.sound === undefined ? DEFAULT_SETTINGS.sound : Boolean(input.sound)
  };
}

export function applySettingsToDocument(settings: ResearcherSettings): void {
  const root = document.documentElement;
  const effects = getStyleEffects(settings);
  root.dataset.interfaceMode = settings.interfaceMode;
  root.dataset.immersion = settings.immersion;
  root.dataset.palette = settings.palette;
  root.dataset.reduceMotion = String(settings.reduceMotion);
  root.dataset.hasScanlines = String(effects.scanlines > 0);
  root.dataset.hasGlow = String(effects.glow > 0);
  root.dataset.hasCurvature = String(effects.curvature > 0);
  root.dataset.hasFlicker = String(effects.flicker > 0 && !settings.reduceMotion);
  root.dataset.hasRunningScanline = String(effects.runningScanline > 0 && !settings.reduceMotion);
  root.style.setProperty('--font-scale', String(settings.fontScale));
  root.style.setProperty('--fx-glow', String(effects.glow / 100));
  root.style.setProperty('--fx-scanlines', String(effects.scanlines / 100));
  root.style.setProperty('--fx-curvature', String(effects.curvature / 100));
  root.style.setProperty('--fx-flicker', String(effects.flicker / 100));
  root.style.setProperty('--fx-vignette', String(effects.vignette / 100));
  root.style.setProperty('--fx-noise', String(effects.noise / 100));
  root.style.setProperty('--fx-reflection', String(effects.reflection / 100));
  root.style.setProperty('--fx-bezel', String(effects.bezel / 100));
  root.style.setProperty('--fx-running-scanline', String(effects.runningScanline / 100));
  root.style.setProperty('--fx-running-scanline-speed', String(Math.max(1.6, 8 - (effects.runningScanlineSpeed / 100) * 6)));
  root.style.setProperty('--fx-random-frequency', String(effects.randomEventFrequency / 100));
  root.style.setProperty('--fx-density', String(effects.density / 100));
}
