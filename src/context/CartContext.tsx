'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { track } from '@/lib/tracking/events';

export interface CartItemType {
  id: string;
  productId: string;
  variantId: string | null;
  productName: string;
  productSlug: string;
  variantTitle: string | null;
  sku: string;
  price: number;
  comparePrice?: number | null;
  quantity: number;
  totalItemPrice: number;
  imageUrl: string;
  imageAlt: string;
  availableStock: number;
}

interface CartContextType {
  items: CartItemType[];
  totalItems: number;
  subtotal: number;
  isOpen: boolean;
  isLoading: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addItem: (params: {
    productId: string;
    variantId?: string | null;
    quantity: number;
    productName: string;
    price: number;
  }) => Promise<{ success: boolean; error?: string }>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItemType[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [subtotal, setSubtotal] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const refreshCart = useCallback(async () => {
    try {
      const res = await fetch('/api/cart');
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setTotalItems(data.totalItems || 0);
        setSubtotal(data.subtotal || 0);
      }
    } catch (err) {
      console.error('Failed to refresh cart:', err);
    }
  }, []);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const openCart = () => setIsOpen(true);
  const closeCart = () => setIsOpen(false);
  const toggleCart = () => setIsOpen((prev) => !prev);

  const addItem = async ({
    productId,
    variantId,
    quantity,
    productName,
    price,
  }: {
    productId: string;
    variantId?: string | null;
    quantity: number;
    productName: string;
    price: number;
  }) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, variantId, quantity }),
      });

      const data = await res.json();

      if (!res.ok) {
        setIsLoading(false);
        return { success: false, error: data.error || 'Failed to add item.' };
      }

      await refreshCart();
      setIsLoading(false);
      setIsOpen(true);

      // Non-blocking Analytics Tracking (BUILD_STANDARDS 4.4)
      track('AddToCart', {
        content_name: productName,
        content_ids: [variantId || productId],
        value: price * quantity,
        currency: 'PKR',
        quantity,
      });

      return { success: true };
    } catch (err) {
      console.error('Add to cart error:', err);
      setIsLoading(false);
      return { success: false, error: 'Network error occurred.' };
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    try {
      const res = await fetch(`/api/cart/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity }),
      });

      if (res.ok) {
        await refreshCart();
      }
    } catch (err) {
      console.error('Update quantity error:', err);
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      const res = await fetch(`/api/cart/items/${itemId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await refreshCart();
      }
    } catch (err) {
      console.error('Remove item error:', err);
    }
  };

  return (
    <CartContext.Provider
      value={{
        items,
        totalItems,
        subtotal,
        isOpen,
        isLoading,
        openCart,
        closeCart,
        toggleCart,
        addItem,
        updateQuantity,
        removeItem,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
