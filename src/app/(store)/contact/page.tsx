export const revalidate = 60;

import React from 'react';
import type { Metadata } from 'next';
import { getSetting } from '@/lib/settings';
import { ContactClient, ContactInfo } from '@/components/storefront/ContactClient';

export const metadata: Metadata = {
  title: 'Contact Us | Customer Support & Inquiries',
  description: 'Get in touch with our customer support team for inquiries on orders, product sizing, and assistance.',
  alternates: {
    canonical: '/contact',
  },
};

export default async function ContactPage() {
  const [email, phone, address, hours, storeName] = await Promise.all([
    getSetting<string>('store.email', 'support@store.com'),
    getSetting<string>('store.phone', '+92 300 0000000'),
    getSetting<string>('store.address', 'Lahore, Punjab, Pakistan'),
    getSetting<string>('store.hours', 'Mon – Sat: 10:00 AM – 8:00 PM PKT'),
    getSetting<string>('store.name', 'AWWeb SaaS Template Store'),
  ]);

  const info: ContactInfo = {
    email,
    phone,
    address,
    hours,
    storeName,
  };

  return <ContactClient info={info} />;
}
