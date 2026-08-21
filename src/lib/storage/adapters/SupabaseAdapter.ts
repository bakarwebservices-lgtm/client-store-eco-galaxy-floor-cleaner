import path from 'path';
import crypto from 'crypto';
import { IStorageAdapter, UploadResult, UploadOptions } from '../types';

export class SupabaseStorageAdapter implements IStorageAdapter {
  readonly name = 'supabase';
  private supabaseUrl: string;
  private supabaseKey: string;
  private bucket: string;

  constructor(supabaseUrl?: string, supabaseKey?: string, bucket?: string) {
    this.supabaseUrl = (
      supabaseUrl ||
      process.env.SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      'https://mdqpfmpbturxijocawkn.supabase.co'
    ).replace(/\/+$/, '');

    this.supabaseKey = (
      supabaseKey ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      ''
    ).trim();

    this.bucket = (bucket || process.env.SUPABASE_STORAGE_BUCKET || 'Media-Bucket').trim();
  }

  private sanitizeFilename(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const basename = path.basename(filename, ext).replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
    const randomSuffix = crypto.randomBytes(6).toString('hex');
    return `${basename}-${Date.now()}-${randomSuffix}${ext}`;
  }

  private extractKey(keyOrUrl: string): string {
    if (!keyOrUrl) return '';
    let clean = keyOrUrl.trim();

    const publicPrefix = `/storage/v1/object/public/${this.bucket}/`;
    const authPrefix = `/storage/v1/object/${this.bucket}/`;

    if (clean.includes(publicPrefix)) {
      clean = clean.split(publicPrefix)[1];
    } else if (clean.includes(authPrefix)) {
      clean = clean.split(authPrefix)[1];
    } else if (clean.startsWith('http://') || clean.startsWith('https://')) {
      try {
        const parsedUrl = new URL(clean);
        clean = parsedUrl.pathname.replace(/^\/+/, '');
        if (clean.startsWith(`${this.bucket}/`)) {
          clean = clean.slice(this.bucket.length + 1);
        }
      } catch {
        clean = path.basename(clean);
      }
    }

    return clean.split('?')[0];
  }

  async uploadFile(
    fileBuffer: Buffer | Uint8Array,
    filename: string,
    mimeType: string,
    options?: UploadOptions
  ): Promise<UploadResult> {
    const sanitizedKey = this.sanitizeFilename(filename);
    const folder = options?.folder ? `${options.folder.replace(/\/+$/, '')}/` : '';
    const fullPath = `${folder}${sanitizedKey}`;

    // Upload to Supabase Storage REST API
    const uploadUrl = `${this.supabaseUrl}/storage/v1/object/${this.bucket}/${fullPath}`;

    const headers: Record<string, string> = {
      'Content-Type': mimeType,
      'x-upsert': 'true',
    };

    if (this.supabaseKey) {
      headers['Authorization'] = `Bearer ${this.supabaseKey}`;
      headers['apikey'] = this.supabaseKey;
    }

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers,
      body: fileBuffer as any,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Supabase Storage upload error response:', errorText);
      throw new Error(`Supabase Storage upload failed (${response.status}): ${errorText}`);
    }

    const publicUrl = this.getUrl(fullPath);

    return {
      url: publicUrl,
      key: fullPath,
      sizeBytes: fileBuffer.length,
      mimeType,
    };
  }

  getUrl(key: string): string {
    const cleanKey = this.extractKey(key);
    return `${this.supabaseUrl}/storage/v1/object/public/${this.bucket}/${cleanKey}`;
  }

  async deleteFile(keyOrUrl: string): Promise<boolean> {
    try {
      const cleanKey = this.extractKey(keyOrUrl);
      if (!cleanKey) return true;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.supabaseKey) {
        headers['Authorization'] = `Bearer ${this.supabaseKey}`;
        headers['apikey'] = this.supabaseKey;
      }

      // 1. Supabase standard batch deletion API
      const batchDeleteUrl = `${this.supabaseUrl}/storage/v1/object/${this.bucket}`;
      const batchResponse = await fetch(batchDeleteUrl, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ prefixes: [cleanKey] }),
      });

      if (batchResponse.ok) {
        return true;
      }

      // 2. Direct single file deletion endpoint fallback
      const singleDeleteUrl = `${this.supabaseUrl}/storage/v1/object/${this.bucket}/${cleanKey}`;
      const singleResponse = await fetch(singleDeleteUrl, {
        method: 'DELETE',
        headers,
      });

      return singleResponse.ok;
    } catch (err) {
      console.warn(`Supabase Storage deletion error for "${keyOrUrl}":`, err);
      return false;
    }
  }
}
