const CACHE_PREFIX = 'scp-reader-';

export function isReaderCacheName(name: string): boolean {
  return name.startsWith(CACHE_PREFIX);
}

export function networkStatusLabel(online: boolean): string {
  return online ? 'NETWORK: ONLINE' : 'NETWORK: OFFLINE / LOCAL ARCHIVE MODE';
}

export async function clearReaderCaches(): Promise<number> {
  if (typeof caches === 'undefined') return 0;
  const names = await caches.keys();
  const managed = names.filter(isReaderCacheName);
  const results = await Promise.all(managed.map((name) => caches.delete(name)));
  return results.filter(Boolean).length;
}
