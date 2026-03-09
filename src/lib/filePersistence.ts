/**
 * File persistence using IndexedDB for blob storage + localStorage for metadata.
 * Files survive page reloads and auto-expire after 24 hours.
 */

import { FileCategory, ConversionStatus } from '@/types';

const DB_NAME = 'transmute-files';
const DB_VERSION = 1;
const STORE_NAME = 'files';
const META_KEY = 'transmute-file-meta';
const EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Serializable metadata stored in localStorage */
export interface PersistedFileMeta {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  category: FileCategory;
  extension: string;
  targetFormat: string | null;
  availableFormats: string[];
  status: ConversionStatus;
  persistedAt: number; // timestamp
}

// ─── IndexedDB helpers ────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function putBlob(id: string, blob: Blob): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(blob, id);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

async function getBlob(id: string): Promise<Blob | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => { db.close(); resolve(req.result as Blob | undefined); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

async function deleteBlob(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

async function clearAllBlobs(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

// ─── Metadata helpers (localStorage) ──────────────────────────

function getMetaList(): PersistedFileMeta[] {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PersistedFileMeta[];
  } catch {
    return [];
  }
}

function setMetaList(metas: PersistedFileMeta[]): void {
  localStorage.setItem(META_KEY, JSON.stringify(metas));
}

// ─── Public API ───────────────────────────────────────────────

/** Persist a single file (blob + metadata) */
export async function persistFile(
  id: string,
  file: File,
  meta: Omit<PersistedFileMeta, 'id' | 'persistedAt'>
): Promise<void> {
  await putBlob(id, file);
  const metas = getMetaList();
  // Remove existing entry with same id (shouldn't happen but be safe)
  const filtered = metas.filter((m) => m.id !== id);
  filtered.push({ ...meta, id, persistedAt: Date.now() });
  setMetaList(filtered);
}

/** Update persisted metadata for a file (e.g. when targetFormat changes) */
export function updatePersistedMeta(
  id: string,
  updates: Partial<Pick<PersistedFileMeta, 'targetFormat' | 'status'>>
): void {
  const metas = getMetaList();
  const idx = metas.findIndex((m) => m.id === id);
  if (idx !== -1) {
    metas[idx] = { ...metas[idx], ...updates };
    setMetaList(metas);
  }
}

/** Remove a single persisted file */
export async function removePersistedFile(id: string): Promise<void> {
  await deleteBlob(id);
  const metas = getMetaList().filter((m) => m.id !== id);
  setMetaList(metas);
}

/** Clear ALL persisted files */
export async function clearAllPersistedFiles(): Promise<void> {
  await clearAllBlobs();
  localStorage.removeItem(META_KEY);
}

/**
 * Load persisted files, pruning any that have expired (>24h).
 * Returns metadata + the reconstructed File objects.
 */
export async function loadPersistedFiles(): Promise<
  Array<PersistedFileMeta & { file: File }>
> {
  const metas = getMetaList();
  const now = Date.now();
  const valid: PersistedFileMeta[] = [];
  const expired: string[] = [];

  for (const meta of metas) {
    if (now - meta.persistedAt > EXPIRY_MS) {
      expired.push(meta.id);
    } else {
      valid.push(meta);
    }
  }

  // Clean up expired blobs
  for (const id of expired) {
    await deleteBlob(id).catch(() => {});
  }

  // Update metadata list (remove expired)
  if (expired.length > 0) {
    setMetaList(valid);
  }

  // Load blobs for valid entries
  const results: Array<PersistedFileMeta & { file: File }> = [];
  for (const meta of valid) {
    try {
      const blob = await getBlob(meta.id);
      if (blob) {
        // Reconstruct a File object from the blob
        const file = new File([blob], meta.name, { type: meta.mimeType });
        results.push({ ...meta, file });
      }
    } catch {
      // If blob retrieval fails, skip this entry
    }
  }

  return results;
}
