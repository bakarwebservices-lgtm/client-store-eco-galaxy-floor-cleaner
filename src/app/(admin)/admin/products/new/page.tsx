export const dynamic = 'force-dynamic';

import React from 'react';
import { db } from '@/lib/db';
import { ProductForm } from '@/components/admin/ProductForm';

export default async function NewProductPage() {
  const categories = await db.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, name: true },
  });

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Create New Product</h1>
        <ProductForm categories={categories} />
      </div>
    </div>
  );
}
