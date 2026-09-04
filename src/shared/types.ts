export type InterfaceMode = 'normal' | 'simulated';
export type ImmersionLevel = 'low' | 'standard' | 'full';
export type PaletteName = 'green' | 'amber' | 'cold' | 'blue' | 'high-contrast';
export type ResearcherRank = 'Research Assistant' | 'Junior Researcher' | 'Researcher' | 'Senior Researcher' | 'Lead Researcher' | 'Principal Researcher';
export type ClearanceLevel = 0 | 1 | 2 | 3 | 4 | 5;
export type DocumentType = 'scp' | 'tale' | 'goi' | 'canon' | 'personnel' | 'essay' | 'guide' | 'hub' | 'joke' | 'explained' | 'art' | 'other';
export type RendererMode = 'foundation-document' | 'specialized';

export interface ResearcherIdentity {
  personnelId: string;
  displayName: string;
  rank: ResearcherRank;
  clearance: ClearanceLevel;
  issuedAt: string;
  lastActiveAt: string;
}

export interface StyleEffectSettings {
  glow: number;
  scanlines: number;
  curvature: number;
  flicker: number;
  vignette: number;
  noise: number;
  reflection: number;
  bezel: number;
  runningScanline: number;
  runningScanlineSpeed: number;
  randomEventFrequency: number;
  density: number;
}

export interface ResearcherSettings {
  interfaceMode: InterfaceMode;
  immersion: ImmersionLevel;
  palette: PaletteName;
  reduceMotion: boolean;
  fontScale: number;
  sound: boolean;
  styleEffects: Record<InterfaceMode, StyleEffectSettings>;
}

export interface ResearchNote {
  id: string;
  documentId: string;
  section?: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccessHistoryEntry {
  id: string;
  at: string;
  type: 'open' | 'note' | 'bookmark' | 'assignment' | 'system';
  documentId?: string;
  detail: string;
}

export interface MailMessageState {
  id: string;
  from: string;
  subject: string;
  body: string;
  receivedAt: string;
  read: boolean;
  simulation: true;
}

export interface AssignmentState {
  id: string;
  startedAt: string;
  completedObjectiveIds: string[];
  completedAt?: string;
}

export interface ResearcherProfile {
  formatVersion: 1;
  researcher: ResearcherIdentity;
  progression: {
    researchScore: number;
    reliability: number;
    investigationScore: number;
    securityCompliance: number;
    promotionReadiness: number;
  };
  assignments: Record<string, AssignmentState>;
  temporaryAccess: string[];
  notes: Record<string, ResearchNote[]>;
  bookmarks: string[];
  history: AccessHistoryEntry[];
  messages: MailMessageState[];
  discoveries: Record<string, boolean>;
  collections: Record<string, string[]>;
  settings: ResearcherSettings;
  windowLayout: Record<string, unknown>;
}

export interface ArchiveAttribution {
  sourceUrl: string;
  sourceSite: 'SCP Foundation Wiki';
  authors: string[];
  citation?: string;
  license: 'CC BY-SA 3.0';
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/';
  revision?: number;
  fetchedAt: string;
}

export interface ArchiveIndexEntry {
  id: string;
  branch: 'en' | string;
  slug: string;
  title: string;
  type: DocumentType;
  summary: string;
  tags: string[];
  clearance: ClearanceLevel;
  renderer: RendererMode;
  objectClass?: string;
  cachedFallback?: boolean;
}

export interface ArchiveDocument extends ArchiveIndexEntry {
  html: string;
  links: string[];
  attribution: ArchiveAttribution;
  synchronized: boolean;
}

export interface AssignmentObjectiveDefinition {
  id: string;
  label: string;
  action?: 'open-record' | 'add-note' | 'bookmark' | 'open-terminal' | 'open-mail';
}

export interface AssignmentDefinition {
  id: string;
  title: string;
  briefing?: string;
  objectives: AssignmentObjectiveDefinition[];
}

export interface TerminalCommand {
  name: string;
  args: string[];
}
