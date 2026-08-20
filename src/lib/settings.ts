import { db } from '@/lib/db';

export async function getSetting<T = any>(key: string, defaultValue: T): Promise<T> {
  try {
    const setting = await db.setting.findUnique({
      where: { key },
    });

    if (!setting || setting.value === null || setting.value === undefined) {
      return defaultValue;
    }

    return setting.value as T;
  } catch (err) {
    console.warn(`Failed to read setting "${key}", falling back to default:`, err);
    return defaultValue;
  }
}
