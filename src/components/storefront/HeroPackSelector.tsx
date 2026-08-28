'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { formatCurrency } from '@/lib/format';
import { ShoppingBag, Zap, Check, ArrowRight } from 'lucide-react';

interface PackOption {
  slug: string;
  name: string;
  bottles: number;
  price: number;
  comparePrice?: number;
  highlight?: boolean;
  savings?: string;
}

const PACKS: PackOption[] = [
  {
    slug: '1-bottle',
    name: '1 Liter Starter Pack',
    bottles: 1,
    price: 649,
  },
  {
    slug: '3-bottles',
    name: '3 Liters Value Pack',
    bottles: 3,
    price: 1499,
    comparePrice: 1947,
    highlight: true,
    savings: 'Save 35%',
  },
  {
    slug: '5-bottles',
    name: '5 Liters Best-Value Pack',
    bottles: 5,
    price: 2299,
    comparePrice: 3245,
    savings: 'Save Rs. 946',
  },
];

export function HeroPackSelector({
  productMap = {},
}: {
  productMap?: Record<string, { id: string; name: string; price: number; comparePrice?: number | null }>;
}) {
  const [selectedSlug, setSelectedSlug] = useState<string>('3-bottles');
  const [loadingAction, setLoadingAction] = useState<'cart' | 'buy' | null>(null);
  const { addItem, openCart } = useCart();
  const router = useRouter();

  const selectedPack = PACKS.find((p) => p.slug === selectedSlug) || PACKS[1];
  const matchedDbProduct = productMap[selectedPack.slug];

  const currentPrice = matchedDbProduct ? matchedDbProduct.price : selectedPack.price;
  const currentCompare = matchedDbProduct
    ? (matchedDbProduct.comparePrice ?? undefined)
    : selectedPack.comparePrice;

  const handleAddToCart = async () => {
    setLoadingAction('cart');
    try {
      const prodId = matchedDbProduct?.id;
      if (prodId) {
        await addItem({
          productId: prodId,
          quantity: 1,
          productName: selectedPack.name,
          price: currentPrice,
          openDrawer: true,
        });
      } else {
        const fallbackRes = await fetch(`/api/products?slug=${selectedPack.slug}`);
        if (fallbackRes.ok) {
          const data = await fallbackRes.json();
          if (data.products?.[0]?.id) {
            await addItem({
              productId: data.products[0].id,
              quantity: 1,
              productName: selectedPack.name,
              price: currentPrice,
              openDrawer: true,
            });
          }
        }
      }
      openCart();
    } catch (err) {
      console.error('Failed to add hero pack to cart:', err);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleBuyNow = async () => {
    setLoadingAction('buy');
    try {
      const prodId = matchedDbProduct?.id;
      if (prodId) {
        await addItem({
          productId: prodId,
          quantity: 1,
          productName: selectedPack.name,
          price: currentPrice,
          openDrawer: false,
        });
      } else {
        const fallbackRes = await fetch(`/api/products?slug=${selectedPack.slug}`);
        if (fallbackRes.ok) {
          const data = await fallbackRes.json();
          if (data.products?.[0]?.id) {
            await addItem({
              productId: data.products[0].id,
              quantity: 1,
              productName: selectedPack.name,
              price: currentPrice,
              openDrawer: false,
            });
          }
        }
      }
      router.push('/checkout');
    } catch (err) {
      console.error('Failed direct checkout buy now:', err);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="rounded-2xl border border-white/20 bg-black/40 p-5 text-white shadow-2xl backdrop-blur-md">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-white/90">
          Select Your Offer
        </span>
        <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-bold text-white border border-white/20 backdrop-blur">
          Cash On Delivery
        </span>
      </div>

      {/* Pack Buttons */}
      <div className="grid grid-cols-3 gap-2.5">
        {PACKS.map((pack) => {
          const isSelected = selectedSlug === pack.slug;
          return (
            <button
              key={pack.slug}
              type="button"
              onClick={() => setSelectedSlug(pack.slug)}
              style={isSelected ? { backgroundColor: 'var(--accent, #10ACB7)' } : undefined}
              className={`relative flex flex-col items-center justify-center rounded-xl p-3 text-center transition-all duration-200 ${
                isSelected
                  ? 'text-white shadow-lg ring-2 ring-white/60 font-bold scale-[1.02]'
                  : 'bg-black/30 text-white/90 hover:bg-black/50 border border-white/15'
              }`}
            >
              {pack.highlight && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-tight text-black shadow-sm whitespace-nowrap">
                  35% OFF
                </span>
              )}
              <span className="text-xs font-extrabold">{pack.bottles} {pack.bottles === 1 ? 'Bottle' : 'Bottles'}</span>
              <span className="text-[11px] opacity-90">{pack.bottles}L Total</span>
              <span className="mt-1 text-xs font-bold text-white">
                Rs. {pack.price.toLocaleString()}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected Pack Pricing Overview */}
      <div className="mt-4 rounded-xl bg-black/50 p-3.5 border border-white/15">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-xs font-medium text-white/80">{selectedPack.name}</div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-extrabold text-white">
                {formatCurrency(currentPrice)}
              </span>
              {currentCompare && (
                <span className="text-xs text-white/50 line-through">
                  {formatCurrency(currentCompare)}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-white/90">
              <Check className="h-3 w-3 text-emerald-400" /> Free Delivery
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={loadingAction !== null}
          className="flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/15 px-4 py-3 text-xs font-bold text-white transition-all hover:bg-white/25 active:scale-95 disabled:opacity-50"
        >
          <ShoppingBag className="h-4 w-4 text-white" />
          <span>{loadingAction === 'cart' ? 'Adding...' : 'Add to Cart'}</span>
        </button>

        <button
          type="button"
          onClick={handleBuyNow}
          disabled={loadingAction !== null}
          style={{ backgroundColor: 'var(--accent, #10ACB7)' }}
          className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-extrabold text-white shadow-lg transition-all hover:brightness-110 hover:shadow-xl active:scale-95 disabled:opacity-50"
        >
          <Zap className="h-4 w-4 fill-current" />
          <span>{loadingAction === 'buy' ? 'Opening...' : 'Buy Now (COD)'}</span>
        </button>
      </div>

      <div className="mt-3 text-center">
        <Link
          href={`/products/${selectedSlug}`}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-white/80 hover:text-white underline decoration-white/30 underline-offset-4"
        >
          <span>View complete product details &amp; ingredients</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
