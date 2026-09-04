import type { ResearcherRank, ResearcherSettings, StyleEffectSettings } from './types.js';

const DEFAULT_NORMAL_EFFECTS: StyleEffectSettings = {
  glow: 16,
  scanlines: 0,
  curvature: 0,
  flicker: 0,
  vignette: 6,
  noise: 0,
  reflection: 0,
  bezel: 0,
  runningScanline: 0,
  runningScanlineSpeed: 45,
  randomEventFrequency: 0,
  density: 38
};

const DEFAULT_SIMULATED_EFFECTS: StyleEffectSettings = {
  glow: 58,
  scanlines: 62,
  curvature: 34,
  flicker: 18,
  vignette: 46,
  noise: 18,
  reflection: 24,
  bezel: 88,
  runningScanline: 34,
  runningScanlineSpeed: 56,
  randomEventFrequency: 44,
  density: 78
};

export const PROFILE_FORMAT_VERSION = 1 as const;
export const RANKS: ResearcherRank[] = ['Research Assistant', 'Junior Researcher', 'Researcher', 'Senior Researcher', 'Lead Researcher', 'Principal Researcher'];
export const DEFAULT_SETTINGS: ResearcherSettings = {
  interfaceMode: 'normal',
  immersion: 'standard',
  palette: 'green',
  reduceMotion: false,
  fontScale: 1,
  sound: true,
  styleEffects: {
    normal: { ...DEFAULT_NORMAL_EFFECTS },
    simulated: { ...DEFAULT_SIMULATED_EFFECTS }
  }
};
export const ARCHIVE_ROOT = './archive';
