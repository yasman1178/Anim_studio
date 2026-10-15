// lib/project-storage.ts
// In-Browser High-Performance IndexedDB Storage Adapter for Anime Dub Studio
// Stores complete video files, audio stems, and project assets with zero file-size limits.

export type MediaType = 
  | 'full_video' 
  | 'isolated_vocal' 
  | 'isolated_instrumental' 
  | 'tts_audio' 
  | 'project_json';

export interface StoredMediaAsset {
  id: string;
  name: string;
  type: MediaType;
  blob: Blob;
  mimeType: string;
  size: number; // in bytes
  createdAt: number; // timestamp
  metadata?: {
    duration?: number;
    shotIndex?: number;
    role?: string;
    originalFileName?: string;
    notes?: string;
  };
}

const DB_NAME = 'AnimeDubStudioDB';
const DB_VERSION = 1;
const STORE_NAME = 'media_assets';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('IndexedDB is only available in the browser'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save a media asset (full video, stem, audio, json) into browser IndexedDB.
 */
export async function saveMediaAsset(
  asset: Omit<StoredMediaAsset, 'id' | 'createdAt' | 'size'> & {
    id?: string;
    createdAt?: number;
  }
): Promise<StoredMediaAsset> {
  const db = await openDB();
  const id = asset.id || `asset_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const createdAt = asset.createdAt || Date.now();
  const size = asset.blob.size;

  const itemToStore: StoredMediaAsset = {
    ...asset,
    id,
    size,
    createdAt,
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(itemToStore);

    request.onsuccess = () => {
      // Dispatch custom window event so UI can immediately update storage counters
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('animedub:storage_updated'));
      }
      resolve(itemToStore);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Retrieve all stored media assets from IndexedDB, sorted newest first.
 */
export async function getAllMediaAssets(): Promise<StoredMediaAsset[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const items: StoredMediaAsset[] = request.result || [];
        items.sort((a, b) => b.createdAt - a.createdAt);
        resolve(items);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to get media assets from IndexedDB:', err);
    return [];
  }
}

/**
 * Get a specific media asset by ID.
 */
export async function getMediaAssetById(id: string): Promise<StoredMediaAsset | undefined> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return undefined;
  }
}

/**
 * Delete an individual media asset from IndexedDB.
 */
export async function deleteMediaAsset(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('animedub:storage_updated'));
      }
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete all media assets and clear project storage.
 */
export async function clearAllMediaAssets(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('animedub:storage_updated'));
      }
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get storage statistics (total bytes, total items, and browser estimated quota).
 */
export async function getStorageStats(): Promise<{
  totalBytes: number;
  count: number;
  quotaBytes?: number;
  usageBytes?: number;
}> {
  const assets = await getAllMediaAssets();
  const totalBytes = assets.reduce((sum, item) => sum + (item.size || 0), 0);

  let quotaBytes: number | undefined;
  let usageBytes: number | undefined;

  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      quotaBytes = estimate.quota;
      usageBytes = estimate.usage;
    } catch {
      // Ignore if estimate API is unsupported
    }
  }

  return {
    totalBytes,
    count: assets.length,
    quotaBytes,
    usageBytes,
  };
}

/**
 * Helper to format bytes into readable MB / KB / GB in Arabic.
 */
export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 بايت';
  if (bytes < 1024) return `${bytes} بايت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ك.ب`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} م.ب`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} ج.ب`;
}

/**
 * Create a temporary Object URL for a stored asset blob.
 * Caller should revoke when no longer needed.
 */
export function createAssetUrl(asset: StoredMediaAsset): string {
  return URL.createObjectURL(asset.blob);
}

/**
 * Fetch a data URL or blob URL and persist it directly into IndexedDB.
 */
export async function saveAudioUrlAsset(
  audioUrl: string,
  name: string,
  type: MediaType = 'tts_audio',
  metadata?: StoredMediaAsset['metadata']
): Promise<StoredMediaAsset | null> {
  try {
    const res = await fetch(audioUrl);
    const blob = await res.blob();
    return await saveMediaAsset({
      name,
      type,
      blob,
      mimeType: blob.type || 'audio/mp3',
      metadata,
    });
  } catch (err) {
    console.error('Failed to save audio URL asset to storage:', err);
    return null;
  }
}
