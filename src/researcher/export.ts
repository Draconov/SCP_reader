import type { ResearcherProfile } from '../shared/types.js';
import { parseProfile, serializeProfile } from './profile.js';

export function downloadProfile(profile: ResearcherProfile): void {
  const blob = new Blob([serializeProfile(profile)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${profile.researcher.personnelId}.scp-id`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export async function readProfileFile(file: File): Promise<ResearcherProfile> {
  return parseProfile(await file.text());
}
