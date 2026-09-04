import type { ArchiveIndexEntry } from '../shared/types.js';

function parseClearanceFilter(token: string): ((value: number) => boolean) | null {
  const match = /^clearance:(<=|>=|=)?([0-5])$/i.exec(token);
  if (!match) return null;
  const op = match[1] || '=';
  const level = Number(match[2]);
  if (op === '<=') return (value) => value <= level;
  if (op === '>=') return (value) => value >= level;
  return (value) => value === level;
}

export function searchArchive(entries: ArchiveIndexEntry[], query: string): ArchiveIndexEntry[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [...entries];
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  const tagFilters = tokens.filter((t) => t.startsWith('tag:')).map((t) => t.slice(4));
  const typeFilters = tokens.filter((t) => t.startsWith('type:')).map((t) => t.slice(5));
  const clearanceFilters = tokens.map(parseClearanceFilter).filter((x): x is (value: number) => boolean => Boolean(x));
  const textTokens = tokens.filter((t) => !t.startsWith('tag:') && !t.startsWith('type:') && !t.startsWith('clearance:'));

  return entries
    .filter((entry) => tagFilters.every((tag) => entry.tags.some((candidate) => candidate.toLowerCase() === tag)))
    .filter((entry) => typeFilters.every((type) => entry.type.toLowerCase() === type))
    .filter((entry) => clearanceFilters.every((filter) => filter(entry.clearance)))
    .map((entry) => {
      const haystack = `${entry.slug} ${entry.title} ${entry.summary} ${entry.tags.join(' ')} ${entry.objectClass ?? ''}`.toLowerCase();
      const matched = textTokens.every((token) => haystack.includes(token));
      const score = textTokens.reduce((sum, token) => {
        if (entry.slug.toLowerCase() === token || entry.title.toLowerCase() === token) return sum + 100;
        if (entry.slug.toLowerCase().includes(token) || entry.title.toLowerCase().includes(token)) return sum + 20;
        if (entry.tags.some((tag) => tag.toLowerCase() === token)) return sum + 10;
        return haystack.includes(token) ? sum + 2 : sum;
      }, 0);
      return { entry, matched, score };
    })
    .filter((row) => row.matched)
    .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))
    .map((row) => row.entry);
}
