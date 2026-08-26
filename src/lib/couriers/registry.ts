import { ICourierAdapter } from './types';
import { PostExAdapter } from './adapters/PostExAdapter';
import { ManualAdapter } from './adapters/ManualAdapter';

class CourierRegistry {
  private adapters: Map<string, ICourierAdapter> = new Map();

  constructor() {
    // Register default launch adapters
    this.registerAdapter(new PostExAdapter());
    this.registerAdapter(new ManualAdapter());
  }

  registerAdapter(adapter: ICourierAdapter): void {
    this.adapters.set(adapter.code.toUpperCase(), adapter);
  }

  getAdapter(code: string): ICourierAdapter {
    const normalized = (code || '').toUpperCase().trim();
    const adapter = this.adapters.get(normalized);
    if (!adapter) {
      throw new Error(`Courier adapter "${code}" is not registered in CourierRegistry.`);
    }
    return adapter;
  }

  hasAdapter(code: string): boolean {
    return this.adapters.has((code || '').toUpperCase().trim());
  }

  listAvailableCouriers(): { code: string; displayName: string; supportsWebhooks: boolean; supportsLabelGeneration: boolean }[] {
    return Array.from(this.adapters.values()).map((adapter) => ({
      code: adapter.code,
      displayName: adapter.displayName,
      supportsWebhooks: adapter.supportsWebhooks,
      supportsLabelGeneration: adapter.supportsLabelGeneration,
    }));
  }
}

export const courierRegistry = new CourierRegistry();

export function getCourierAdapter(code: string): ICourierAdapter {
  return courierRegistry.getAdapter(code);
}
