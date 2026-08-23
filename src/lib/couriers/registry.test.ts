import { describe, it, expect } from 'vitest';
import { courierRegistry, getCourierAdapter } from './registry';

describe('CourierRegistry', () => {
  it('registers and resolves PostEx and Manual adapters by default', () => {
    expect(courierRegistry.hasAdapter('POSTEX')).toBe(true);
    expect(courierRegistry.hasAdapter('postex')).toBe(true);
    expect(courierRegistry.hasAdapter('MANUAL')).toBe(true);

    const postex = getCourierAdapter('POSTEX');
    expect(postex.code).toBe('POSTEX');
    expect(postex.displayName).toBe('PostEx Courier');

    const manual = getCourierAdapter('MANUAL');
    expect(manual.code).toBe('MANUAL');
    expect(manual.displayName).toBe('Manual / Self-Delivery');
  });

  it('throws an error when requesting an unknown courier', () => {
    expect(() => getCourierAdapter('UNKNOWN_COURIER')).toThrow(
      'Courier adapter "UNKNOWN_COURIER" is not registered in CourierRegistry.'
    );
  });

  it('lists available couriers for admin UI selectors', () => {
    const list = courierRegistry.listAvailableCouriers();
    expect(list.length).toBeGreaterThanOrEqual(2);
    expect(list.some((c) => c.code === 'POSTEX')).toBe(true);
    expect(list.some((c) => c.code === 'MANUAL')).toBe(true);
  });
});
