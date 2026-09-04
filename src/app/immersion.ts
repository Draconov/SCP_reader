import type { ImmersionLevel, ResearcherProfile } from '../shared/types.js';

type AuthProfile = Pick<ResearcherProfile, 'researcher'> | { researcher: Pick<ResearcherProfile['researcher'], 'personnelId' | 'displayName' | 'rank' | 'clearance'> };

export function buildAuthSequence(profile: AuthProfile, immersion: ImmersionLevel): string[] {
  if (immersion === 'low') return [];
  const base = [
    `READING CREDENTIAL ${profile.researcher.personnelId}...`,
    `PERSONNEL RECORD: ${profile.researcher.displayName.toUpperCase()}`,
    `${profile.researcher.rank.toUpperCase()} / CLEARANCE LEVEL ${profile.researcher.clearance}`
  ];
  if (immersion === 'full') {
    base.push('VERIFYING ARCHIVE AUTHORIZATION...', 'SECURITY AUDIT: PASS', 'LOCAL PERSONNEL STORE: VERIFIED', 'ESTABLISHING SECURE ARCHIVE SESSION...');
  } else {
    base.push('VERIFYING ARCHIVE AUTHORIZATION...');
  }
  base.push('ACCESS GRANTED');
  return base;
}

export function authStepDelay(immersion: ImmersionLevel): number {
  if (immersion === 'low') return 0;
  return immersion === 'full' ? 150 : 95;
}
