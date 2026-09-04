import { ARCHIVE_ROOT } from '../shared/constants.js';
import type { ArchiveDocument, ArchiveIndexEntry } from '../shared/types.js';
import { FALLBACK_INDEX, fallbackDocument } from './fallback.js';

export async function loadArchiveIndex(): Promise<ArchiveIndexEntry[]> {
  try {
    const response = await fetch(`${ARCHIVE_ROOT}/index.json`, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Archive index HTTP ${response.status}`);
    const parsed = await response.json() as ArchiveIndexEntry[];
    return Array.isArray(parsed) && parsed.length ? parsed : FALLBACK_INDEX;
  } catch {
    return FALLBACK_INDEX;
  }
}

export async function loadArchiveDocument(id: string, index?: ArchiveIndexEntry[]): Promise<ArchiveDocument> {
  const entry = (index ?? FALLBACK_INDEX).find((candidate) => candidate.id === id) ?? FALLBACK_INDEX.find((candidate) => candidate.id === id);
  const slug = id.includes(':') ? id.split(':').slice(1).join(':') : id;
  try {
    const response = await fetch(`${ARCHIVE_ROOT}/documents/${encodeURIComponent(slug)}.json`);
    if (!response.ok) throw new Error(`Archive document HTTP ${response.status}`);
    return await response.json() as ArchiveDocument;
  } catch {
    if (entry) return fallbackDocument(entry);
    throw new Error(`Archive record ${id} is unavailable.`);
  }
}
