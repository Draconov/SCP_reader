import type { ArchiveDocument, ArchiveIndexEntry } from '../shared/types.js';

export const FALLBACK_INDEX: ArchiveIndexEntry[] = [
  { id: 'en:scp-049', branch: 'en', slug: 'scp-049', title: 'SCP-049', type: 'scp', summary: 'Archive seed. Synchronize to retrieve the canonical SCP Wiki record.', tags: ['euclid', 'humanoid', 'biological'], clearance: 1, renderer: 'foundation-document', objectClass: 'Euclid', cachedFallback: true },
  { id: 'en:scp-096', branch: 'en', slug: 'scp-096', title: 'SCP-096', type: 'scp', summary: 'Archive seed. Synchronize to retrieve the canonical SCP Wiki record.', tags: ['euclid', 'humanoid'], clearance: 1, renderer: 'foundation-document', objectClass: 'Euclid', cachedFallback: true },
  { id: 'en:scp-173', branch: 'en', slug: 'scp-173', title: 'SCP-173', type: 'scp', summary: 'Archive seed. Synchronize to retrieve the canonical SCP Wiki record.', tags: ['euclid'], clearance: 1, renderer: 'foundation-document', objectClass: 'Euclid', cachedFallback: true },
  { id: 'en:scp-682', branch: 'en', slug: 'scp-682', title: 'SCP-682', type: 'scp', summary: 'Archive seed. Synchronize to retrieve the canonical SCP Wiki record.', tags: ['keter'], clearance: 2, renderer: 'foundation-document', objectClass: 'Keter', cachedFallback: true },
  { id: 'en:scp-999', branch: 'en', slug: 'scp-999', title: 'SCP-999', type: 'scp', summary: 'Archive seed. Synchronize to retrieve the canonical SCP Wiki record.', tags: ['safe'], clearance: 1, renderer: 'foundation-document', objectClass: 'Safe', cachedFallback: true }
];

export function fallbackDocument(entry: ArchiveIndexEntry): ArchiveDocument {
  return {
    ...entry,
    html: `<div class="archive-unsynced"><h2>LOCAL INDEX RECORD ONLY</h2><p>The canonical article has not been synchronized into this deployment yet.</p><p>Run the archive sync workflow or open the original SCP Wiki source.</p></div>`,
    links: [],
    synchronized: false,
    attribution: {
      sourceUrl: `https://scp-wiki.wikidot.com/${entry.slug}`,
      sourceSite: 'SCP Foundation Wiki',
      authors: ['See original source page'],
      license: 'CC BY-SA 3.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
      fetchedAt: new Date(0).toISOString()
    }
  };
}
