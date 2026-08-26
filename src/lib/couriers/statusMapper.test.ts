import { describe, it, expect } from 'vitest';
import { mapPostExStatus, shouldUpdateShipmentStatus } from './statusMapper';
import { ShipmentStatus } from '@prisma/client';

describe('Courier Status Mapper & Monotonic Comparator', () => {
  it('maps various PostEx status strings accurately', () => {
    expect(mapPostExStatus('Booked')).toBe(ShipmentStatus.BOOKED);
    expect(mapPostExStatus('Order Placed')).toBe(ShipmentStatus.BOOKED);
    expect(mapPostExStatus('Arrived at Origin')).toBe(ShipmentStatus.PICKED_UP);
    expect(mapPostExStatus('In Transit to Hub')).toBe(ShipmentStatus.IN_TRANSIT);
    expect(mapPostExStatus('Out for Delivery')).toBe(ShipmentStatus.OUT_FOR_DELIVERY);
    expect(mapPostExStatus('Delivered Successfully')).toBe(ShipmentStatus.DELIVERED);
    expect(mapPostExStatus('Customer Unavailable / Failed')).toBe(ShipmentStatus.FAILED_ATTEMPT);
    expect(mapPostExStatus('Returned to Origin (RTO)')).toBe(ShipmentStatus.RETURNED_TO_ORIGIN);
    expect(mapPostExStatus('Cancelled by merchant')).toBe(ShipmentStatus.CANCELLED);
    expect(mapPostExStatus('On Hold / Address Issue')).toBe(ShipmentStatus.ON_HOLD);
    expect(mapPostExStatus(null)).toBe(ShipmentStatus.BOOKED);
  });

  it('enforces monotonic status progression and prevents downgrade', () => {
    // Normal progression allowed
    expect(shouldUpdateShipmentStatus(ShipmentStatus.BOOKED, ShipmentStatus.PICKED_UP)).toBe(true);
    expect(shouldUpdateShipmentStatus(ShipmentStatus.PICKED_UP, ShipmentStatus.IN_TRANSIT)).toBe(true);
    expect(shouldUpdateShipmentStatus(ShipmentStatus.IN_TRANSIT, ShipmentStatus.OUT_FOR_DELIVERY)).toBe(true);
    expect(shouldUpdateShipmentStatus(ShipmentStatus.OUT_FOR_DELIVERY, ShipmentStatus.DELIVERED)).toBe(true);

    // Out-of-order downgrade rejected
    expect(shouldUpdateShipmentStatus(ShipmentStatus.DELIVERED, ShipmentStatus.IN_TRANSIT)).toBe(false);
    expect(shouldUpdateShipmentStatus(ShipmentStatus.OUT_FOR_DELIVERY, ShipmentStatus.PICKED_UP)).toBe(false);

    // Terminal transition to return allowed from delivered
    expect(shouldUpdateShipmentStatus(ShipmentStatus.DELIVERED, ShipmentStatus.RETURNED_TO_ORIGIN)).toBe(true);

    // Cancelled shipments do not accept status updates
    expect(shouldUpdateShipmentStatus(ShipmentStatus.CANCELLED, ShipmentStatus.DELIVERED)).toBe(false);
  });
});
