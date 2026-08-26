import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { IStorageAdapter, UploadResult, UploadOptions } from '../types';

export class LocalStorageAdapter implements IStorageAdapter {
  readonly name = 'local';
  private uploadsDir: string;

  constructor(customUploadsDir?: string) {
    this.uploadsDir = customUploadsDir || path.join(process.cwd(), 'public', 'uploads');
  }

  private async ensureDir(): Promise<void> {
    try {
      await fs.mkdir(this.uploadsDir, { recursive: true });
    } catch {
      // directory already exists
    }
  }

  private sanitizeFilename(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const basename = path.basename(filename, ext).replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
    const randomSuffix = crypto.randomBytes(4).toString('hex');
    return `${basename}-${Date.now()}-${randomSuffix}${ext}`;
  }

  async uploadFile(
    fileBuffer: Buffer | Uint8Array,
    filename: string,
    mimeType: string,
    _options?: UploadOptions
  ): Promise<UploadResult> {
    await this.ensureDir();

    const sanitized = this.sanitizeFilename(filename);
    const filePath = path.join(this.uploadsDir, sanitized);

    await fs.writeFile(filePath, fileBuffer);

    return {
      url: `/uploads/${sanitized}`,
      key: sanitized,
      sizeBytes: fileBuffer.length,
      mimeType,
    };
  }

  getUrl(key: string): string {
    return `/uploads/${key}`;
  }

  async deleteFile(key: string): Promise<boolean> {
    try {
      const sanitizedKey = path.basename(key);
      const filePath = path.join(this.uploadsDir, sanitizedKey);
      await fs.unlink(filePath);
      return true;
    } catch (err) {
      console.warn(`Local file deletion warning for key "${key}":`, err);
      return false;
    }
  }
}
