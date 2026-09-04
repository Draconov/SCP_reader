import type { ResearcherProfile } from '../shared/types.js';
import { parseProfile, serializeProfile } from './profile.js';

const DB_NAME = 'scp-research-terminal';
const DB_VERSION = 1;
const PROFILE_STORE = 'profiles';
const META_STORE = 'meta';
const ACTIVE_KEY = 'activeProfileId';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error('Unable to open profile database.'));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PROFILE_STORE)) db.createObjectStore(PROFILE_STORE, { keyPath: 'researcher.personnelId' });
      if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE);
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Profile database transaction failed.'));
    tx.onabort = () => reject(tx.error ?? new Error('Profile database transaction aborted.'));
  });
}

export class ResearcherStore {
  async list(): Promise<ResearcherProfile[]> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const request = db.transaction(PROFILE_STORE).objectStore(PROFILE_STORE).getAll();
      request.onsuccess = () => resolve(request.result as ResearcherProfile[]);
      request.onerror = () => reject(request.error);
    });
  }

  async get(id: string): Promise<ResearcherProfile | undefined> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const request = db.transaction(PROFILE_STORE).objectStore(PROFILE_STORE).get(id);
      request.onsuccess = () => resolve(request.result as ResearcherProfile | undefined);
      request.onerror = () => reject(request.error);
    });
  }

  async save(profile: ResearcherProfile): Promise<void> {
    const db = await openDatabase();
    const tx = db.transaction(PROFILE_STORE, 'readwrite');
    tx.objectStore(PROFILE_STORE).put(profile);
    await transactionDone(tx);
  }

  async remove(id: string): Promise<void> {
    const db = await openDatabase();
    const tx = db.transaction([PROFILE_STORE, META_STORE], 'readwrite');
    tx.objectStore(PROFILE_STORE).delete(id);
    const meta = tx.objectStore(META_STORE);
    const activeRequest = meta.get(ACTIVE_KEY);
    await new Promise<void>((resolve) => {
      activeRequest.onsuccess = () => {
        if (activeRequest.result === id) meta.delete(ACTIVE_KEY);
        resolve();
      };
      activeRequest.onerror = () => resolve();
    });
    await transactionDone(tx);
  }

  async setActiveId(id: string | null): Promise<void> {
    const db = await openDatabase();
    const tx = db.transaction(META_STORE, 'readwrite');
    if (id) tx.objectStore(META_STORE).put(id, ACTIVE_KEY); else tx.objectStore(META_STORE).delete(ACTIVE_KEY);
    await transactionDone(tx);
  }

  async getActiveId(): Promise<string | null> {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const request = db.transaction(META_STORE).objectStore(META_STORE).get(ACTIVE_KEY);
      request.onsuccess = () => resolve(typeof request.result === 'string' ? request.result : null);
      request.onerror = () => resolve(null);
    });
  }
}

export class LocalStorageResearcherStore {
  private prefix = 'scp-reader-profile:';
  private active = 'scp-reader-active-profile';

  async list(): Promise<ResearcherProfile[]> {
    const profiles: ResearcherProfile[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        try { profiles.push(parseProfile(localStorage.getItem(key) ?? '')); } catch { /* ignore broken fallback entries */ }
      }
    }
    return profiles;
  }
  async get(id: string): Promise<ResearcherProfile | undefined> {
    const raw = localStorage.getItem(this.prefix + id);
    return raw ? parseProfile(raw) : undefined;
  }
  async save(profile: ResearcherProfile): Promise<void> { localStorage.setItem(this.prefix + profile.researcher.personnelId, serializeProfile(profile)); }
  async remove(id: string): Promise<void> { localStorage.removeItem(this.prefix + id); if (localStorage.getItem(this.active) === id) localStorage.removeItem(this.active); }
  async setActiveId(id: string | null): Promise<void> { if (id) localStorage.setItem(this.active, id); else localStorage.removeItem(this.active); }
  async getActiveId(): Promise<string | null> { return localStorage.getItem(this.active); }
}

export type ProfileStore = Pick<ResearcherStore, 'list' | 'get' | 'save' | 'remove' | 'setActiveId' | 'getActiveId'>;

export function createProfileStore(): ProfileStore {
  return typeof indexedDB === 'undefined' ? new LocalStorageResearcherStore() : new ResearcherStore();
}
