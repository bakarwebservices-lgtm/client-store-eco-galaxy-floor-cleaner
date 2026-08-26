import { ShipmentStatus } from '@prisma/client';

/**
 * Status hierarchy ranks to prevent out-of-order webhook delivery from corrupting state.
 * Higher rank = later in lifecycle.
 * Special terminal / exception states (CANCELLED, RETURNED_TO_ORIGIN) are handled separately.
 */
export const STATUS_RANKS: Record<ShipmentStatus, number> = {
  PENDING: 0,
  BOOKED: 1,
  PICKED_UP: 2,
  IN_TRANSIT: 3,
  OUT_FOR_DELIVERY: 4,
  FAILED_ATTEMPT: 4,
  DELIVERED: 5,
  ON_HOLD: 3,
  RETURNED_TO_ORIGIN: 6,
  CANCELLED: 6,
};

/**
 * Maps raw PostEx courier status strings to normalized ShipmentStatus enum.
 */
export function mapPostExStatus(rawStatus?: string | null): ShipmentStatus {
  if (!rawStatus) return ShipmentStatus.BOOKED;

  const normalized = rawStatus.trim().toLowerCase();

  if (normalized.includes('unbooked') || normalized.includes('un-booked')) {
    return ShipmentStatus.PENDING;
  }
  if (normalized.includes('booked') || normalized.includes('order placed') || normalized.includes('created')) {
    return ShipmentStatus.BOOKED;
  }
  if (
    normalized.includes('picked up') ||
    normalized.includes('arrived at origin') ||
    normalized.includes('collected') ||
    normalized.includes('received at station')
  ) {
    return ShipmentStatus.PICKED_UP;
  }
  if (
    normalized.includes('in transit') ||
    normalized.includes('in-transit') ||
    normalized.includes('arrived at destination') ||
    normalized.includes('dispatched') ||
    normalized.includes('transit')
  ) {
    return ShipmentStatus.IN_TRANSIT;
  }
  if (normalized.includes('out for delivery') || normalized.includes('with rider') || normalized.includes('assigned')) {
    return ShipmentStatus.OUT_FOR_DELIVERY;
  }
  if (normalized.includes('delivered') || normalized.includes('successful') || normalized.includes('completed')) {
    return ShipmentStatus.DELIVERED;
  }
  if (
    normalized.includes('failed') ||
    normalized.includes('unsuccessful') ||
    normalized.includes('customer unavailable') ||
    normalized.includes('refused') ||
    normalized.includes('attempted')
  ) {
    return ShipmentStatus.FAILED_ATTEMPT;
  }
  if (
    normalized.includes('returned') ||
    normalized.includes('rto') ||
    normalized.includes('return to origin') ||
    normalized.includes('returning')
  ) {
    return ShipmentStatus.RETURNED_TO_ORIGIN;
  }
  if (normalized.includes('cancelled') || normalized.includes('canceled')) {
    return ShipmentStatus.CANCELLED;
  }
  if (normalized.includes('hold') || normalized.includes('exception') || normalized.includes('address issue')) {
    return ShipmentStatus.ON_HOLD;
  }

  return ShipmentStatus.IN_TRANSIT;
}

/**
 * Determines whether a new incoming status event should update the current shipment status
 * based on monotonic status progression.
 */
export function shouldUpdateShipmentStatus(
  currentStatus: ShipmentStatus,
  incomingStatus: ShipmentStatus
): boolean {
  // If current is already terminal, do not downgrade unless transitioning to return/cancellation
  if (currentStatus === ShipmentStatus.DELIVERED) {
    return (
      incomingStatus === ShipmentStatus.RETURNED_TO_ORIGIN ||
      incomingStatus === ShipmentStatus.CANCELLED
    );
  }

  if (currentStatus === ShipmentStatus.CANCELLED) {
    return false;
  }

  // Terminal states always take precedence
  if (
    incomingStatus === ShipmentStatus.RETURNED_TO_ORIGIN ||
    incomingStatus === ShipmentStatus.CANCELLED ||
    incomingStatus === ShipmentStatus.DELIVERED
  ) {
    return true;
  }

  const currentRank = STATUS_RANKS[currentStatus] ?? 0;
  const incomingRank = STATUS_RANKS[incomingStatus] ?? 0;

  // Allow status advance or same level updates (e.g. FAILED_ATTEMPT <-> OUT_FOR_DELIVERY)
  return incomingRank >= currentRank;
}
