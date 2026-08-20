import { IStorageAdapter } from './types';
import { LocalStorageAdapter } from './adapters/LocalAdapter';

class StorageRegistry {
  private adapters: Map<string, IStorageAdapter> = new Map();
  private activeDriver: string = 'local';

  constructor() {
    // Default local filesystem adapter
    this.registerAdapter(new LocalStorageAdapter());
  }

  registerAdapter(adapter: IStorageAdapter): void {
    this.adapters.set(adapter.name, adapter);
  }

  setAdapter(name: string): void {
    if (!this.adapters.has(name)) {
      throw new Error(`Storage adapter "${name}" is not registered in StorageRegistry.`);
    }
    this.activeDriver = name;
  }

  getAdapter(): IStorageAdapter {
    const adapter = this.adapters.get(this.activeDriver);
    if (!adapter) {
      throw new Error(`Active storage adapter "${this.activeDriver}" not found.`);
    }
    return adapter;
  }
}

// Global storage adapter registry singleton
export const storageRegistry = new StorageRegistry();

export function getStorageAdapter(): IStorageAdapter {
  return storageRegistry.getAdapter();
}
