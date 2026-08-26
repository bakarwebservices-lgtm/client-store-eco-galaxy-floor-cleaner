export const dynamic = 'force-dynamic';

import React from 'react';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { ProductForm } from '@/components/admin/ProductForm';

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [product, categories] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { position: 'asc' } },
        variants: { orderBy: { createdAt: 'asc' } },
        categories: true,
      },
    }),
    db.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true },
    }),
  ]);

  if (!product || product.deletedAt) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Edit Product: {product.name}</h1>
        <ProductForm initialData={product} categories={categories} isEditing={true} />
      </div>
    </div>
  );
}
