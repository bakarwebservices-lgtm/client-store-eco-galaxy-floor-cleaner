import { IStorageAdapter } from './types';
import { LocalStorageAdapter } from './adapters/LocalAdapter';
import { SupabaseStorageAdapter } from './adapters/SupabaseAdapter';
import { CloudinaryStorageAdapter } from './adapters/CloudinaryAdapter';

class StorageRegistry {
  private adapters: Map<string, IStorageAdapter> = new Map();

  constructor() {
    this.registerAdapter(new LocalStorageAdapter());
    this.registerAdapter(new SupabaseStorageAdapter());
    this.registerAdapter(new CloudinaryStorageAdapter());
  }

  registerAdapter(adapter: IStorageAdapter): void {
    this.adapters.set(adapter.name.toLowerCase(), adapter);
  }

  setAdapter(name: string): void {
    const normalized = name.toLowerCase();
    if (!this.adapters.has(normalized)) {
      throw new Error(`Storage adapter "${name}" is not registered in StorageRegistry.`);
    }
    // Explicit override
    process.env.STORAGE_DRIVER = normalized;
  }

  getActiveDriver(): string {
    if (process.env.STORAGE_DRIVER && this.adapters.has(process.env.STORAGE_DRIVER.toLowerCase())) {
      return process.env.STORAGE_DRIVER.toLowerCase();
    }

    // Cloudinary if explicitly configured with credentials
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      return 'cloudinary';
    }

    // Supabase Storage in production or when Supabase keys/URL are configured
    if (
      process.env.SUPABASE_URL ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NODE_ENV === 'production'
    ) {
      return 'supabase';
    }

    // Fallback to local
    return 'local';
  }

  getAdapter(preferredDriver?: string): IStorageAdapter {
    const driver = (preferredDriver || this.getActiveDriver()).toLowerCase();
    const adapter = this.adapters.get(driver) || this.adapters.get('supabase') || this.adapters.get('local');
    if (!adapter) {
      throw new Error(`Active storage adapter "${driver}" not found.`);
    }
    return adapter;
  }
}

// Global storage adapter registry singleton
export const storageRegistry = new StorageRegistry();

export function getStorageAdapter(driver?: string): IStorageAdapter {
  return storageRegistry.getAdapter(driver);
}
