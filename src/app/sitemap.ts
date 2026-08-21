import { MetadataRoute } from 'next';
import { db } from '@/lib/db';
import { ProductStatus, BlogStatus, PageStatus } from '@prisma/client';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://saas-product-website-seven.vercel.app';

  // Static core routes
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/products`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/faq`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
  ];

  try {
    const [products, categories, collections, articles, pages] = await Promise.all([
      db.product.findMany({
        where: { status: ProductStatus.ACTIVE, deletedAt: null },
        select: { slug: true, updatedAt: true },
      }),
      db.category.findMany({
        where: { isActive: true },
        select: { slug: true, updatedAt: true },
      }),
      db.collection.findMany({
        where: { isActive: true },
        select: { slug: true, updatedAt: true },
      }),
      db.blogArticle.findMany({
        where: { status: BlogStatus.PUBLISHED },
        select: { slug: true, updatedAt: true },
      }),
      db.page.findMany({
        where: { status: PageStatus.ACTIVE },
        select: { slug: true, updatedAt: true },
      }),
    ]);

    const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
      url: `${baseUrl}/products/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

    const categoryRoutes: MetadataRoute.Sitemap = categories.map((c) => ({
      url: `${baseUrl}/categories/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

    const collectionRoutes: MetadataRoute.Sitemap = collections.map((col) => ({
      url: `${baseUrl}/collections/${col.slug}`,
      lastModified: col.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

    const blogRoutes: MetadataRoute.Sitemap = articles.map((a) => ({
      url: `${baseUrl}/blog/${a.slug}`,
      lastModified: a.updatedAt,
      changeFrequency: 'monthly',
      priority: 0.6,
    }));

    const pageRoutes: MetadataRoute.Sitemap = pages.map((pg) => ({
      url: `${baseUrl}/pages/${pg.slug}`,
      lastModified: pg.updatedAt,
      changeFrequency: 'monthly',
      priority: 0.5,
    }));

    return [...staticRoutes, ...productRoutes, ...categoryRoutes, ...collectionRoutes, ...blogRoutes, ...pageRoutes];
  } catch (err) {
    console.warn('Could not generate dynamic sitemap routes during build:', err);
    return staticRoutes;
  }
}
