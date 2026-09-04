import { DEFAULT_SETTINGS, PROFILE_FORMAT_VERSION } from '../shared/constants.js';
import type { AccessHistoryEntry, ClearanceLevel, ResearcherProfile, ResearcherRank } from '../shared/types.js';

function now(): string {
  return new Date().toISOString();
}

function randomDigits(count: number): string {
  const max = 10 ** count;
  if (typeof globalThis.crypto !== 'undefined' && 'getRandomValues' in globalThis.crypto) {
    const buffer = new Uint32Array(1);
    globalThis.crypto.getRandomValues(buffer);
    return String(buffer[0] % max).padStart(count, '0');
  }
  return String(Math.floor(Math.random() * max)).padStart(count, '0');
}

function initialWelcomeMessage() {
  return {
    id: `mail-${Date.now()}-${randomDigits(4)}`,
    from: 'RESEARCH ADMINISTRATION',
    subject: 'Personnel credential issued',
    body: 'Your Foundation research credential is active. Review Orientation R-0001 before beginning unrestricted archive work.',
    receivedAt: now(),
    read: false,
    simulation: true as const
  };
}

export function issueProfile(displayName: string): ResearcherProfile {
  const trimmed = displayName.trim();
  if (!trimmed) throw new Error('Researcher name is required.');
  const issuedAt = now();
  const profile: ResearcherProfile = {
    formatVersion: PROFILE_FORMAT_VERSION,
    researcher: {
      personnelId: `R-${randomDigits(5)}`,
      displayName: trimmed,
      rank: 'Research Assistant',
      clearance: 1,
      issuedAt,
      lastActiveAt: issuedAt
    },
    progression: { researchScore: 0, reliability: 0, investigationScore: 0, securityCompliance: 10, promotionReadiness: 0 },
    assignments: {},
    temporaryAccess: [],
    notes: {},
    bookmarks: [],
    history: [],
    messages: [initialWelcomeMessage()],
    discoveries: {},
    collections: {},
    settings: { ...DEFAULT_SETTINGS },
    windowLayout: {}
  };
  return profile;
}

export function serializeProfile(profile: ResearcherProfile): string {
  return JSON.stringify(profile, null, 2);
}

function isRank(value: unknown): value is ResearcherRank {
  return typeof value === 'string' && ['Research Assistant', 'Junior Researcher', 'Researcher', 'Senior Researcher', 'Lead Researcher', 'Principal Researcher'].includes(value);
}

function isClearance(value: unknown): value is ClearanceLevel {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 5;
}

export function parseProfile(input: string): ResearcherProfile {
  let value: unknown;
  try {
    value = JSON.parse(input);
  } catch {
    throw new Error('Invalid SCP ID profile: malformed JSON.');
  }
  if (!value || typeof value !== 'object') throw new Error('Invalid SCP ID profile: expected object.');
  const candidate = value as Partial<ResearcherProfile>;
  const r = candidate.researcher;
  if (candidate.formatVersion !== 1 || !r || typeof r.personnelId !== 'string' || !/^R-\d{5}$/.test(r.personnelId) || typeof r.displayName !== 'string' || !isRank(r.rank) || !isClearance(r.clearance)) {
    throw new Error('Invalid SCP ID profile: missing or invalid personnel fields.');
  }
  if (!candidate.settings || !candidate.progression || !candidate.notes || !candidate.bookmarks || !candidate.history || !candidate.messages || !candidate.assignments) {
    throw new Error('Invalid SCP ID profile: incomplete career data.');
  }
  return candidate as ResearcherProfile;
}

export function addHistory(profile: ResearcherProfile, entry: Omit<AccessHistoryEntry, 'id' | 'at'>): ResearcherProfile {
  const historyEntry: AccessHistoryEntry = {
    ...entry,
    id: `history-${Date.now()}-${randomDigits(4)}`,
    at: now()
  };
  return {
    ...profile,
    researcher: { ...profile.researcher, lastActiveAt: now() },
    history: [...profile.history.slice(-199), historyEntry]
  };
}
