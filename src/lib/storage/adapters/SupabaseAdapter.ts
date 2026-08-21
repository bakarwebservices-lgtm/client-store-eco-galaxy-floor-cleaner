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
    return `${this.supabaseUrl}/storage/v1/object/public/${this.bucket}/${key}`;
  }

  async deleteFile(key: string): Promise<boolean> {
    try {
      const deleteUrl = `${this.supabaseUrl}/storage/v1/object/${this.bucket}/${key}`;
      const headers: Record<string, string> = {};

      if (this.supabaseKey) {
        headers['Authorization'] = `Bearer ${this.supabaseKey}`;
        headers['apikey'] = this.supabaseKey;
      }

      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers,
      });

      return response.ok;
    } catch (err) {
      console.warn(`Supabase Storage deletion error for key "${key}":`, err);
      return false;
    }
  }
}
