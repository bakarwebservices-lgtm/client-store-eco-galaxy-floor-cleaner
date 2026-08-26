export interface UploadResult {
  url: string;
  key: string;
  sizeBytes: number;
  mimeType: string;
  width?: number;
  height?: number;
}

export interface UploadOptions {
  folder?: string;
  allowedMimeTypes?: string[];
  maxSizeBytes?: number;
}

export interface IStorageAdapter {
  readonly name: string;
  uploadFile(
    fileBuffer: Buffer | Uint8Array,
    filename: string,
    mimeType: string,
    options?: UploadOptions
  ): Promise<UploadResult>;
  getUrl(key: string): string;
  deleteFile(key: string): Promise<boolean>;
}
