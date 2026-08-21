import { IStorageAdapter } from './types';
import { LocalStorageAdapter } from './adapters/LocalAdapter';
import { SupabaseStorageAdapter } from './adapters/SupabaseAdapter';
import { CloudinaryStorageAdapter } from './adapters/CloudinaryAdapter';

class StorageRegistry {
  private adapters: Map<string, IStorageAdapter> = new Map();
  private activeDriver: string = 'local';

  constructor() {
    // Register available storage adapters
    this.registerAdapter(new LocalStorageAdapter());
    this.registerAdapter(new SupabaseStorageAdapter());
    this.registerAdapter(new CloudinaryStorageAdapter());

    // Auto-detect best storage driver
    this.autoDetectDriver();
  }

  private autoDetectDriver(): void {
    if (process.env.STORAGE_DRIVER && this.adapters.has(process.env.STORAGE_DRIVER.toLowerCase())) {
      this.activeDriver = process.env.STORAGE_DRIVER.toLowerCase();
      return;
    }

    // Cloudinary takes precedence if explicitly configured
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      this.activeDriver = 'cloudinary';
      return;
    }

    // Supabase Storage if Supabase URL / Key is configured
    if (
      process.env.SUPABASE_URL ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_URL
    ) {
      this.activeDriver = 'supabase';
      return;
    }

    // Fallback to local
    this.activeDriver = 'local';
  }

  registerAdapter(adapter: IStorageAdapter): void {
    this.adapters.set(adapter.name, adapter);
  }

  setAdapter(name: string): void {
    const normalized = name.toLowerCase();
    if (!this.adapters.has(normalized)) {
      throw new Error(`Storage adapter "${name}" is not registered in StorageRegistry.`);
    }
    this.activeDriver = normalized;
  }

  getAdapter(preferredDriver?: string): IStorageAdapter {
    const driver = (preferredDriver || this.activeDriver).toLowerCase();
    const adapter = this.adapters.get(driver) || this.adapters.get('local');
    if (!adapter) {
      throw new Error(`Active storage adapter "${driver}" not found.`);
    }
    return adapter;
  }

  getActiveDriver(): string {
    return this.activeDriver;
  }
}

// Global storage adapter registry singleton
export const storageRegistry = new StorageRegistry();

export function getStorageAdapter(driver?: string): IStorageAdapter {
  return storageRegistry.getAdapter(driver);
}
