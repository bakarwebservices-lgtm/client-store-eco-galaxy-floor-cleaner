'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Truck,
  Package,
  MapPin,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  RotateCcw,
  XCircle,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
} from 'lucide-react';
import { formatCurrency } from '@/lib/format';

export interface TrackingEventItem {
  id?: string;
  status: string;
  rawStatus?: string | null;
  description?: string | null;
  location?: string | null;
  eventTime: string | Date;
}

export interface TrackingShipmentData {
  trackingNumber: string;
  courierName: string;
  courierCode: string;
  status: string;
  rawStatus?: string | null;
  isCod?: boolean;
  codAmount?: number;
  currency?: string;
  bookedAt?: string | Date;
  deliveredAt?: string | Date | null;
  trackingUrl?: string | null;
  recipient?: {
    name?: string;
    city?: string;
    country?: string;
  };
  events?: TrackingEventItem[];
}

interface TrackingStepperProps {
  shipment: TrackingShipmentData;
  className?: string;
}

const MILESTONES = [
  { key: 'BOOKED', label: 'Order Booked', desc: 'Consignment generated' },
  { key: 'PICKED_UP', label: 'Collected', desc: 'Picked up from warehouse' },
  { key: 'IN_TRANSIT', label: 'In Transit', desc: 'On the way to destination' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', desc: 'Courier on final route' },
  { key: 'DELIVERED', label: 'Delivered', desc: 'Package received' },
];

function getMilestoneIndex(status: string): number {
  switch (status) {
    case 'PENDING':
    case 'BOOKED':
      return 0;
    case 'PICKED_UP':
      return 1;
    case 'IN_TRANSIT':
      return 2;
    case 'OUT_FOR_DELIVERY':
      return 3;
    case 'DELIVERED':
      return 4;
    default:
      return 0;
  }
}

export function TrackingStepper({ shipment, className = '' }: TrackingStepperProps) {
  const [copied, setCopied] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);

  const isRto = shipment.status === 'RETURNED_TO_ORIGIN';
  const isCancelled = shipment.status === 'CANCELLED';
  const isDelivered = shipment.status === 'DELIVERED';
  const isFailed = shipment.status === 'FAILED_ATTEMPT';

  const currentIndex = getMilestoneIndex(shipment.status);

  const handleCopy = () => {
    navigator.clipboard.writeText(shipment.trackingNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm space-y-6 ${className}`}>
      {/* Top Banner: Courier & Tracking # Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Truck className="h-3.5 w-3.5" />
            </span>
            <h3 className="text-sm font-bold text-foreground">
              {shipment.courierName || 'Courier Partner'}
            </h3>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                isDelivered
                  ? 'bg-success/15 text-success'
                  : isRto || isCancelled
                  ? 'bg-destructive/15 text-destructive'
                  : 'bg-primary/10 text-primary'
              }`}
            >
              {shipment.rawStatus || shipment.status.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {shipment.recipient?.city ? `Destination: ${shipment.recipient.city}, ${shipment.recipient.country || 'Pakistan'}` : 'Delivery in progress'}
          </p>
        </div>

        {/* Tracking Number pill & Actions */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-xs font-mono">
            <span className="text-muted-foreground text-[10px] uppercase">Tracking:</span>
            <span className="font-bold text-foreground">{shipment.trackingNumber}</span>
            <button
              type="button"
              onClick={handleCopy}
              className="text-muted-foreground hover:text-foreground transition-colors p-0.5 ml-1"
              title="Copy tracking number"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>

          {shipment.trackingUrl && (
            <a
              href={shipment.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
              title="Track on courier portal"
            >
              <ExternalLink className="h-3.5 w-3.5 text-primary" />
              <span className="hidden sm:inline">Live Portal</span>
            </a>
          )}
        </div>
      </div>

      {/* Special Edge Case Alert Badges */}
      {isRto && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive">
          <RotateCcw className="h-4 w-4 shrink-0" />
          <span>Parcel delivery could not be completed and is being returned to the merchant origin.</span>
        </div>
      )}

      {isCancelled && (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-muted p-3.5 text-xs text-muted-foreground">
          <XCircle className="h-4 w-4 shrink-0" />
          <span>This consignment booking was cancelled prior to physical courier collection.</span>
        </div>
      )}

      {isFailed && (
        <div className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3.5 text-xs text-warning">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Delivery was attempted but could not be completed. The courier will re-attempt delivery shortly.</span>
        </div>
      )}

      {/* Visual Stepper Progress Bar (Active when not cancelled/RTO) */}
      {!isCancelled && !isRto && (
        <div className="space-y-4 pt-2">
          {/* Desktop / Tablet Stepper */}
          <div className="relative hidden sm:grid grid-cols-5 gap-2">
            {/* Background Connecting Line */}
            <div className="absolute top-4 left-6 right-6 h-0.5 bg-border -z-0" />
            <div
              className="absolute top-4 left-6 h-0.5 bg-primary transition-all duration-500 -z-0"
              style={{
                width: `calc(${(currentIndex / (MILESTONES.length - 1)) * 100}% - 24px)`,
              }}
            />

            {MILESTONES.map((step, idx) => {
              const isPast = idx < currentIndex;
              const isCurrent = idx === currentIndex;
              const isFuture = idx > currentIndex;

              return (
                <div key={step.key} className="flex flex-col items-center text-center relative z-10">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-all ${
                      isPast || isCurrent
                        ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                        : 'border-border bg-card text-muted-foreground'
                    } ${isCurrent ? 'ring-4 ring-primary/20 scale-110' : ''}`}
                  >
                    {isPast || isDelivered ? (
                      <Check className="h-4 w-4 stroke-[3]" />
                    ) : isCurrent ? (
                      <Clock className="h-3.5 w-3.5 animate-pulse" />
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <span
                    className={`text-xs font-bold mt-2 ${
                      isCurrent ? 'text-primary' : isPast ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {step.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                    {step.desc}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Mobile Vertical Stepper */}
          <div className="sm:hidden space-y-3 pl-2">
            {MILESTONES.map((step, idx) => {
              const isPast = idx < currentIndex;
              const isCurrent = idx === currentIndex;

              return (
                <div key={step.key} className="flex items-start gap-3 relative">
                  {idx !== MILESTONES.length - 1 && (
                    <div
                      className={`absolute left-3.5 top-6 bottom-0 w-0.5 ${
                        isPast ? 'bg-primary' : 'bg-border'
                      }`}
                    />
                  )}
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold ${
                      isPast || isCurrent
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card text-muted-foreground'
                    }`}
                  >
                    {isPast || (isDelivered && isCurrent) ? (
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <div>
                    <p
                      className={`text-xs font-bold ${
                        isCurrent ? 'text-primary' : isPast ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {step.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Payment & Consignment Details Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          <span>
            {shipment.isCod ? (
              <>
                Collection: <strong className="text-foreground font-mono">{formatCurrency(shipment.codAmount || 0, shipment.currency || 'PKR')}</strong> (COD)
              </>
            ) : (
              <strong className="text-success">Prepaid Order</strong>
            )}
          </span>
        </div>

        {shipment.bookedAt && (
          <div className="text-[11px]">
            Booked: {new Date(shipment.bookedAt).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Expandable Chronological Journey Timeline */}
      {shipment.events && shipment.events.length > 0 && (
        <div className="border-t border-border pt-4 space-y-3">
          <button
            type="button"
            onClick={() => setShowTimeline(!showTimeline)}
            className="flex w-full items-center justify-between text-xs font-bold text-foreground hover:text-primary transition-colors"
          >
            <span>Detailed Tracking History ({shipment.events.length} milestones)</span>
            {showTimeline ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {showTimeline && (
            <div className="space-y-3 pt-2">
              {shipment.events.map((evt, idx) => (
                <div key={evt.id || idx} className="relative flex items-start gap-3 pl-2">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary mt-0.5">
                    <MapPin className="h-3 w-3" />
                  </div>
                  <div className="flex-1 text-xs space-y-0.5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                      <span className="font-bold text-foreground">{evt.rawStatus || evt.status}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {new Date(evt.eventTime).toLocaleString()}
                      </span>
                    </div>
                    {evt.description && <p className="text-muted-foreground text-[11px]">{evt.description}</p>}
                    {evt.location && (
                      <p className="text-[10px] font-semibold text-primary">{evt.location}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
