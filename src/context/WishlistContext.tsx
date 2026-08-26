'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface WishlistItem {
  id: string;
  name: string;
  slug: string;
  price: number;
  imageUrl?: string;
  addedAt: number;
}

interface WishlistContextType {
  wishlist: WishlistItem[];
  totalWishlist: number;
  isInWishlist: (productId: string) => boolean;
  toggleWishlist: (item: { id: string; name: string; slug: string; price: number; imageUrl?: string }) => boolean;
  removeFromWishlist: (productId: string) => void;
  clearWishlist: () => void;
}

const WishlistContext = createContext<WishlistContextType | null>(null);

const STORAGE_KEY = 'aw_store_wishlist';

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setWishlist(JSON.parse(stored));
      }
    } catch (err) {
      console.warn('Failed to load wishlist from localStorage:', err);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(wishlist));
    } catch (err) {
      console.warn('Failed to save wishlist to localStorage:', err);
    }
  }, [wishlist, isInitialized]);

  const isInWishlist = useCallback(
    (productId: string) => {
      return wishlist.some((item) => item.id === productId);
    },
    [wishlist]
  );

  const toggleWishlist = useCallback(
    (item: { id: string; name: string; slug: string; price: number; imageUrl?: string }): boolean => {
      let isNowWishlisted = false;
      setWishlist((prev) => {
        const exists = prev.some((i) => i.id === item.id);
        if (exists) {
          isNowWishlisted = false;
          return prev.filter((i) => i.id !== item.id);
        } else {
          isNowWishlisted = true;
          return [
            ...prev,
            {
              id: item.id,
              name: item.name,
              slug: item.slug,
              price: item.price,
              imageUrl: item.imageUrl,
              addedAt: Date.now(),
            },
          ];
        }
      });
      return isNowWishlisted;
    },
    []
  );

  const removeFromWishlist = useCallback((productId: string) => {
    setWishlist((prev) => prev.filter((i) => i.id !== productId));
  }, []);

  const clearWishlist = useCallback(() => {
    setWishlist([]);
  }, []);

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        totalWishlist: wishlist.length,
        isInWishlist,
        toggleWishlist,
        removeFromWishlist,
        clearWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}
