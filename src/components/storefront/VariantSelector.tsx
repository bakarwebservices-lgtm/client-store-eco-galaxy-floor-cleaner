'use client';

import React from 'react';

export interface VariantOption {
  id: string;
  title: string;
  sku: string;
  price: number | null;
  comparePrice: number | null;
  inventoryQty: number;
  color?: string | null;
  size?: string | null;
  isActive: boolean;
}

export function VariantSelector({
  variants,
  selectedVariant,
  onSelectVariant,
}: {
  variants: VariantOption[];
  selectedVariant: VariantOption | null;
  onSelectVariant: (variant: VariantOption) => void;
}) {
  if (variants.length === 0) return null;

  return (
    <div className="space-y-3">
      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Select Option: <span className="text-foreground font-medium">{selectedVariant?.title}</span>
      </label>
      <div className="flex flex-wrap gap-2">
        {variants.map((v) => {
          const isSelected = selectedVariant?.id === v.id;
          const isOutOfStock = v.inventoryQty <= 0;

          return (
            <button
              key={v.id}
              type="button"
              disabled={!v.isActive}
              onClick={() => onSelectVariant(v)}
              className={`rounded-lg border px-3.5 py-2 text-xs font-medium transition-all ${
                isSelected
                  ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                  : 'border-border bg-card text-foreground hover:border-foreground/40'
              } ${isOutOfStock ? 'opacity-50' : ''}`}
            >
              <span>{v.title}</span>
              {isOutOfStock && <span className="ml-1.5 text-[10px] text-destructive">(Out of stock)</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
