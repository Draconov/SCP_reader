import { DEFAULT_SETTINGS } from '../shared/constants.js';
import type { ImmersionLevel, InterfaceMode, PaletteName, ResearcherSettings } from '../shared/types.js';

const interfaceModes: InterfaceMode[] = ['modern', 'hybrid', 'legacy', 'archive'];
const immersionLevels: ImmersionLevel[] = ['low', 'standard', 'full'];
const palettes: PaletteName[] = ['green', 'amber', 'cold', 'blue', 'high-contrast'];

export function normalizeSettings(input: Partial<ResearcherSettings>): ResearcherSettings {
  const fontScale = typeof input.fontScale === 'number' && Number.isFinite(input.fontScale)
    ? Math.min(1.5, Math.max(0.8, input.fontScale))
    : DEFAULT_SETTINGS.fontScale;
  return {
    ...DEFAULT_SETTINGS,
    ...input,
    interfaceMode: interfaceModes.includes(input.interfaceMode as InterfaceMode) ? input.interfaceMode as InterfaceMode : DEFAULT_SETTINGS.interfaceMode,
    immersion: immersionLevels.includes(input.immersion as ImmersionLevel) ? input.immersion as ImmersionLevel : DEFAULT_SETTINGS.immersion,
    palette: palettes.includes(input.palette as PaletteName) ? input.palette as PaletteName : DEFAULT_SETTINGS.palette,
    fontScale
  };
}

export function applySettingsToDocument(settings: ResearcherSettings): void {
  const root = document.documentElement;
  root.dataset.interfaceMode = settings.interfaceMode;
  root.dataset.immersion = settings.immersion;
  root.dataset.palette = settings.palette;
  root.dataset.scanlines = String(settings.scanlines);
  root.dataset.glow = String(settings.glow);
  root.dataset.curvature = String(settings.curvature);
  root.dataset.flicker = String(settings.flicker && !settings.reduceMotion);
  root.dataset.reduceMotion = String(settings.reduceMotion);
  root.style.setProperty('--font-scale', String(settings.fontScale));
}
