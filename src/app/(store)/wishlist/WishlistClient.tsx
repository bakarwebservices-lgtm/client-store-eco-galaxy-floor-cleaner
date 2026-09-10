'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useWishlist } from '@/context/WishlistContext';
import { useCart } from '@/context/CartContext';
import { formatCurrency } from '@/lib/format';
import { Heart, ShoppingBag, Trash2, ArrowLeft, ArrowRight, Check, Loader2, Sparkles } from 'lucide-react';

export default function WishlistClient() {
  const { wishlist, removeFromWishlist, clearWishlist } = useWishlist();
  const { addItem, openCart } = useCart();
  const [mounted, setMounted] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<string[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [addingAll, setAddingAll] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleAddToCart = async (item: {
    id: string;
    name: string;
    slug: string;
    price: number;
    imageUrl?: string;
  }) => {
    setAddingId(item.id);
    try {
      await addItem({
        productId: item.id,
        quantity: 1,
        productName: item.name,
        price: item.price,
        openDrawer: true,
      });

      setAddedIds((prev) => [...prev, item.id]);
      setTimeout(() => {
        setAddedIds((prev) => prev.filter((id) => id !== item.id));
      }, 2500);
    } catch (err) {
      console.error('Failed to add wishlist item to cart:', err);
    } finally {
      setAddingId(null);
    }
  };

  const handleAddAllToCart = async () => {
    if (wishlist.length === 0) return;
    setAddingAll(true);
    try {
      for (const item of wishlist) {
        await addItem({
          productId: item.id,
          quantity: 1,
          productName: item.name,
          price: item.price,
          openDrawer: false,
        });
      }
      openCart();
    } catch (err) {
      console.error('Failed to add all items to cart:', err);
    } finally {
      setAddingAll(false);
    }
  };

  if (!mounted) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="space-y-6 animate-pulse">
          <div className="h-8 w-48 bg-muted rounded-xl" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-3/4 bg-muted rounded-2xl" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 min-h-[65vh]">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground transition-colors">
          Home
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">Wishlist</span>
      </nav>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              My Wishlist
            </h1>
            {wishlist.length > 0 && (
              <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                {wishlist.length}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {wishlist.length === 0
              ? 'Your saved items will appear here for easy shopping.'
              : `You have ${wishlist.length} saved ${wishlist.length === 1 ? 'item' : 'items'} in your wishlist.`}
          </p>
        </div>

        {wishlist.length > 0 && (
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleAddAllToCart}
              disabled={addingAll}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {addingAll ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ShoppingBag className="h-3.5 w-3.5" />
              )}
              <span>Add All to Bag</span>
            </button>

            {showClearConfirm ? (
              <div className="inline-flex items-center gap-1.5 rounded-xl border border-destructive/30 bg-destructive/10 p-1">
                <span className="text-[11px] font-semibold text-destructive px-2">Clear all?</span>
                <button
                  type="button"
                  onClick={() => {
                    clearWishlist();
                    setShowClearConfirm(false);
                  }}
                  className="rounded-lg bg-destructive px-2 py-1 text-[11px] font-bold text-destructive-foreground hover:bg-destructive/90 transition-colors"
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="rounded-lg bg-card px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3.5 py-2.5 text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Clear all wishlist items"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Clear List</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Empty State */}
      {wishlist.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center space-y-5 my-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Heart className="h-8 w-8 stroke-[1.5]" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Your wishlist is empty
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Explore our catalog and tap the heart icon on any product to save it here for later.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary-hover transition-colors"
            >
              <Sparkles className="h-4 w-4" />
              <span>Explore Products</span>
            </Link>
          </div>
        </div>
      ) : (
        /* Wishlist Grid */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {wishlist.map((item) => {
            const isAdding = addingId === item.id;
            const isAdded = addedIds.includes(item.id);

            return (
              <div
                key={item.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card shadow-xs hover:border-primary/40 hover:shadow-md transition-all duration-200"
              >
                {/* Image & Quick Remove */}
                <div className="relative aspect-square w-full overflow-hidden bg-muted">
                  <Link href={`/products/${item.slug}`} className="block h-full w-full">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                        <ShoppingBag className="h-8 w-8 opacity-40" />
                      </div>
                    )}
                  </Link>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => removeFromWishlist(item.id)}
                    className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-card/90 text-muted-foreground shadow-xs backdrop-blur-xs hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    aria-label={`Remove ${item.name} from wishlist`}
                    title="Remove item"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Details & Actions */}
                <div className="flex flex-1 flex-col justify-between p-3.5 sm:p-4 space-y-3">
                  <div className="space-y-1">
                    <Link
                      href={`/products/${item.slug}`}
                      className="line-clamp-2 text-xs sm:text-sm font-bold text-foreground hover:text-primary transition-colors leading-snug"
                    >
                      {item.name}
                    </Link>
                    <p className="text-xs sm:text-sm font-extrabold text-foreground">
                      {formatCurrency(item.price)}
                    </p>
                  </div>

                  {/* Add to Cart Button */}
                  <button
                    type="button"
                    onClick={() => handleAddToCart(item)}
                    disabled={isAdding}
                    className={`w-full flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-xs font-bold transition-colors shadow-xs ${
                      isAdded
                        ? 'bg-success text-success-foreground'
                        : 'bg-primary text-primary-foreground hover:bg-primary-hover'
                    } disabled:opacity-50`}
                  >
                    {isAdding ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : isAdded ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>Added to Bag</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="h-3.5 w-3.5" />
                        <span>Move to Bag</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Footer Back Link */}
      {wishlist.length > 0 && (
        <div className="flex items-center justify-between border-t border-border pt-6">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Continue Shopping</span>
          </Link>
        </div>
      )}
    </main>
  );
}
