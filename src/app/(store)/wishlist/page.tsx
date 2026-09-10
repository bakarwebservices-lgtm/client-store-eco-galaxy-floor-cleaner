import { Metadata } from 'next';
import WishlistClient from './WishlistClient';

export const metadata: Metadata = {
  title: 'My Wishlist',
  description: 'View and manage your saved wishlist items.',
};

export const dynamic = 'force-dynamic';

export default function WishlistPage() {
  return <WishlistClient />;
}
