// lib/blob-store.ts
// High-performance Public Blob Storage Provider for Anime Dub Studio
// Compatible with Vercel Blob API format and local in-memory/file storage

export interface StoredBlob {
  url: string;
  pathname: string;
  contentType: string;
  contentDisposition: string;
  size: number;
  uploadedAt: string;
  dataBase64?: string;
}

// Global in-memory storage cache so media persists during server session
const globalBlobMap = new Map<string, StoredBlob>();

export class PublicBlobStorage {
  static isInitialized = true;

  static async put(pathname: string, buffer: Buffer, options?: { contentType?: string }): Promise<StoredBlob> {
    const contentType = options?.contentType || 'application/octet-stream';
    const cleanPath = pathname.replace(/^\/+/, '');
    const url = `/api/blob?pathname=${encodeURIComponent(cleanPath)}`;

    const blob: StoredBlob = {
      url,
      pathname: cleanPath,
      contentType,
      contentDisposition: `inline; filename="${cleanPath.split('/').pop() || 'media'}"`,
      size: buffer.length,
      uploadedAt: new Date().toISOString(),
      dataBase64: buffer.toString('base64'),
    };

    globalBlobMap.set(cleanPath, blob);
    return blob;
  }

  static async get(pathname: string): Promise<StoredBlob | null> {
    const cleanPath = pathname.replace(/^\/+/, '');
    return globalBlobMap.get(cleanPath) || null;
  }

  static async list(): Promise<StoredBlob[]> {
    return Array.from(globalBlobMap.values());
  }

  static async del(pathname: string): Promise<boolean> {
    const cleanPath = pathname.replace(/^\/+/, '');
    return globalBlobMap.delete(cleanPath);
  }

  static async stats(): Promise<{ count: number; totalBytes: number }> {
    let totalBytes = 0;
    for (const item of globalBlobMap.values()) {
      totalBytes += item.size;
    }
    return {
      count: globalBlobMap.size,
      totalBytes,
    };
  }
}
