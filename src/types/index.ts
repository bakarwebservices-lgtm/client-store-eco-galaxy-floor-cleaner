import { Product, ProductVariant, ProductImage, Category, Order, OrderItem, Customer, CustomerAddress } from '@prisma/client';

export type ProductWithRelations = Product & {
  images: ProductImage[];
  variants: ProductVariant[];
  categories: {
    category: Pick<Category, 'id' | 'name' | 'slug'>;
  }[];
};

export type OrderWithDetails = Order & {
  customer: Customer;
  items: (OrderItem & {
    product?: { slug: string; images: { url: string }[] } | null;
    variant?: Pick<ProductVariant, 'id' | 'title' | 'sku' | 'inventoryQty'> | null;
  })[];
};

export type CustomerSessionData = {
  customerId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
};
