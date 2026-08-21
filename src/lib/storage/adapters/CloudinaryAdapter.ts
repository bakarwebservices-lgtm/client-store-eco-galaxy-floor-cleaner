import crypto from 'crypto';
import { IStorageAdapter, UploadResult, UploadOptions } from '../types';

export class CloudinaryStorageAdapter implements IStorageAdapter {
  readonly name = 'cloudinary';
  private cloudName: string;
  private apiKey: string;
  private apiSecret: string;

  constructor(cloudName?: string, apiKey?: string, apiSecret?: string) {
    this.cloudName = (cloudName || process.env.CLOUDINARY_CLOUD_NAME || '').trim();
    this.apiKey = (apiKey || process.env.CLOUDINARY_API_KEY || '').trim();
    this.apiSecret = (apiSecret || process.env.CLOUDINARY_API_SECRET || '').trim();
  }

  private generateSignature(params: Record<string, string>): string {
    const sortedKeys = Object.keys(params).sort();
    const stringToSign = sortedKeys.map((k) => `${k}=${params[k]}`).join('&') + this.apiSecret;
    return crypto.createHash('sha1').update(stringToSign).digest('hex');
  }

  async uploadFile(
    fileBuffer: Buffer | Uint8Array,
    filename: string,
    mimeType: string,
    options?: UploadOptions
  ): Promise<UploadResult> {
    if (!this.cloudName || !this.apiKey || !this.apiSecret) {
      throw new Error('Cloudinary credentials (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) are missing.');
    }

    const timestamp = Math.round(Date.now() / 1000).toString();
    const folder = options?.folder || 'products';
    const resourceType = mimeType.startsWith('video/') ? 'video' : 'image';

    const paramsToSign: Record<string, string> = {
      folder,
      timestamp,
    };

    const signature = this.generateSignature(paramsToSign);

    const formData = new FormData();
    const blob = new Blob([fileBuffer as unknown as BlobPart], { type: mimeType });
    formData.append('file', blob, filename);
    formData.append('api_key', this.apiKey);
    formData.append('timestamp', timestamp);
    formData.append('folder', folder);
    formData.append('signature', signature);

    const uploadUrl = `https://api.cloudinary.com/v1_1/${this.cloudName}/${resourceType}/upload`;

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cloudinary upload error:', errorText);
      throw new Error(`Cloudinary upload failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    return {
      url: data.secure_url || data.url,
      key: data.public_id,
      sizeBytes: data.bytes || fileBuffer.length,
      mimeType,
      width: data.width,
      height: data.height,
    };
  }

  getUrl(key: string): string {
    return `https://res.cloudinary.com/${this.cloudName}/image/upload/${key}`;
  }

  async deleteFile(key: string): Promise<boolean> {
    try {
      if (!this.cloudName || !this.apiKey || !this.apiSecret) return false;

      const timestamp = Math.round(Date.now() / 1000).toString();
      const paramsToSign: Record<string, string> = {
        public_id: key,
        timestamp,
      };

      const signature = this.generateSignature(paramsToSign);

      const formData = new FormData();
      formData.append('public_id', key);
      formData.append('api_key', this.apiKey);
      formData.append('timestamp', timestamp);
      formData.append('signature', signature);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${this.cloudName}/image/destroy`, {
        method: 'POST',
        body: formData,
      });

      return response.ok;
    } catch (err) {
      console.warn(`Cloudinary deletion error for key "${key}":`, err);
      return false;
    }
  }
}
