import type { ResearcherRank, ResearcherSettings } from './types.js';

export const PROFILE_FORMAT_VERSION = 1 as const;
export const RANKS: ResearcherRank[] = ['Research Assistant', 'Junior Researcher', 'Researcher', 'Senior Researcher', 'Lead Researcher', 'Principal Researcher'];
export const DEFAULT_SETTINGS: ResearcherSettings = {
  interfaceMode: 'hybrid',
  immersion: 'standard',
  palette: 'green',
  scanlines: true,
  glow: true,
  curvature: false,
  flicker: false,
  reduceMotion: false,
  fontScale: 1,
  sound: true
};
export const ARCHIVE_ROOT = './archive';
