import { PrismaClient, AdminRole, ProductStatus, PageStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

function generateSecureRandomPassword(length = 16): string {
  return crypto.randomBytes(length).toString('base64url').slice(0, length);
}

async function main() {
  const isCustomPassword = Boolean(process.env.INITIAL_ADMIN_PASSWORD);
  const adminEmail = (process.env.INITIAL_ADMIN_EMAIL || 'admin@store.com').toLowerCase().trim();
  const adminName = process.env.INITIAL_ADMIN_NAME || 'Store Administrator';
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || generateSecureRandomPassword(16);

  console.log('\n=============================================================================');
  console.log('🌱 Eco Galaxy — Database Seeder');
  console.log('=============================================================================');

  const existingAdmin = await prisma.adminUser.findUnique({
    where: { email: adminEmail },
  });

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  if (existingAdmin) {
    console.log(`ℹ️ Admin user (${adminEmail}) already exists. Resetting credentials...`);
    await prisma.adminUser.update({
      where: { id: existingAdmin.id },
      data: {
        passwordHash,
        role: AdminRole.ADMIN,
        name: adminName,
      },
    });
  } else {
    console.log(`✨ Creating new super admin user: ${adminEmail}...`);
    await prisma.adminUser.create({
      data: {
        email: adminEmail,
        name: adminName,
        passwordHash,
        role: AdminRole.ADMIN,
      },
    });
  }

  // Seed Store Settings
  const defaultSettings = [
    { key: 'store.currency', value: 'PKR', description: 'Store base currency code' },
    { key: 'store.country', value: 'Pakistan', description: 'Store operating country' },
    { key: 'shipping.free_threshold', value: 0, description: 'Free shipping qualifying order subtotal' },
    { key: 'shipping.standard_cost', value: 0, description: 'Standard flat rate shipping fee' },
    { key: 'store.name', value: 'Eco Galaxy', description: 'Store display name' },
    { key: 'store.tagline', value: 'Make Every Floor Feel Brand New. | صاف فرش، خوشبودار گھر', description: 'Store tagline' },
    { key: 'store.description', value: 'Meet Eco Galaxy Floor Cleaner — a 1 Liter lavender-fragrance floor-care choice made for an easy everyday cleaning routine. Free delivery across Pakistan with Cash on Delivery.', description: 'Store public meta description' },
    { key: 'store.logo_url', value: '/images/eco-galaxy-logo-bg-removed.png', description: 'Store official logo' },
    { key: 'store.email', value: 'support@ecogalaxy.store', description: 'Store support email' },
    { key: 'store.phone', value: '0346 4815775', description: 'Store support phone & WhatsApp' },
    { key: 'store.address', value: 'Lahore, Punjab, Pakistan', description: 'Store operating address' },
    { key: 'store.hours', value: 'Mon – Sat: 9:00 AM – 9:00 PM PKT', description: 'Customer support hours' },
    { key: 'theme.primary_color', value: '#042A1E', description: 'Store primary theme color' },
    { key: 'theme.accent_color', value: '#10B981', description: 'Store accent theme color' },
    { key: 'theme.font_family', value: 'Inter', description: 'Store default font family' },
    { key: 'announcement.enabled', value: true, description: 'Show top announcement banner' },
    { key: 'announcement.text', value: 'FREE DELIVERY ACROSS PAKISTAN • CASH ON DELIVERY AVAILABLE • 100% ORIGINAL FORMULA', description: 'Top announcement bar message' },
    { key: 'announcement.bg_color', value: '#032017', description: 'Top announcement bar background color' },
    { key: 'announcement.text_color', value: '#A7F3D0', description: 'Top announcement bar text color' },
    { key: 'tax.rate', value: 0, description: 'Default sales tax percentage' },
  ];

  console.log('⚙️  Seeding Eco Galaxy Store Settings...');
  for (const setting of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: {
        key: setting.key,
        value: setting.value,
      },
    });
    console.log(`   ✓ ${setting.key}: ${JSON.stringify(setting.value)}`);
  }

  // Seed Category
  console.log('📂 Seeding Category...');
  const category = await prisma.category.upsert({
    where: { slug: 'floor-cleaners' },
    update: {
      name: 'Floor Cleaners',
      description: 'Premium eco-friendly floor cleaning solutions with long-lasting lavender fragrance.',
      isActive: true,
    },
    create: {
      name: 'Floor Cleaners',
      slug: 'floor-cleaners',
      description: 'Premium eco-friendly floor cleaning solutions with long-lasting lavender fragrance.',
      isActive: true,
      sortOrder: 1,
    },
  });

  // Seed 3 Real Product Packs
  console.log('🧴 Seeding Eco Galaxy Products...');
  const productsData = [
    {
      slug: '1-bottle',
      name: 'Eco Galaxy Floor Cleaner — 1 Liter Starter Pack',
      description: '<p><strong>Eco Galaxy Floor Cleaner (1 Liter Starter Pack)</strong> is a premium lavender-fragrance floor cleaner formulated for everyday sparkling clean floors.</p><ul><li>1 Liter standard bottle</li><li>Long-lasting lavender fragrance</li><li>Safe on marble, tile, ceramic & hardwood surfaces</li><li>Free Delivery & Cash on Delivery across Pakistan</li></ul>',
      price: 649,
      comparePrice: 999,
      sku: 'EG-1L-01',
      variantTitle: '1 Bottle (1 Liter)',
      images: [
        { url: '/images/Plastic_bottle_on_wooden_table_202608270227.jpeg', altText: 'Eco Galaxy 1 Liter Floor Cleaner Starter Pack' },
        { url: '/images/Plastic_bottle_on_wooden_table_202608270227 (1).jpeg', altText: 'Eco Galaxy Floor Cleaner Bottle on Wooden Table' },
      ],
    },
    {
      slug: '3-bottles',
      name: 'Eco Galaxy Floor Cleaner — 3 Liter Value Pack',
      description: '<p><strong>Eco Galaxy Floor Cleaner (3 Liter Value Pack)</strong> is our most popular package, saving you 35% compared to single bottle purchases.</p><ul><li>3 × 1 Liter standard bottles (3 Liters total)</li><li>Deep stain lifting and brilliant streak-free gloss</li><li>Long-lasting fresh lavender fragrance</li><li>Free Nationwide Delivery & Cash on Delivery</li></ul>',
      price: 1499,
      comparePrice: 2499,
      sku: 'EG-3L-03',
      variantTitle: '3 Bottles (3 Liters) — Save 35%',
      images: [
        { url: '/images/Plastic_bottle_on_wooden_table_202608270227 (1).jpeg', altText: 'Eco Galaxy 3 Liter Floor Cleaner Value Pack' },
        { url: '/images/Plastic_bottle_on_wooden_table_202608270227.jpeg', altText: 'Eco Galaxy 1 Liter Bottle' },
        { url: '/images/Plastic_bottle_on_wooden_table_202608270227 (3).jpeg', altText: 'Eco Galaxy Floor Cleaner Usage' },
      ],
    },
    {
      slug: '5-bottles',
      name: 'Eco Galaxy Floor Cleaner — 5 Liter Best-Value Pack',
      description: '<p><strong>Eco Galaxy Floor Cleaner (5 Liter Best-Value Pack)</strong> is our ultimate family reserve bundle, delivering the maximum savings and highest value per bottle.</p><ul><li>5 × 1 Liter standard bottles (5 Liters total)</li><li>Heavy duty cleaning power for whole homes and commercial floors</li><li>Soothing lavender aroma that lingers for hours</li><li>Free Nationwide Delivery & Cash on Delivery</li></ul>',
      price: 2299,
      comparePrice: 3999,
      sku: 'EG-5L-05',
      variantTitle: '5 Bottles (5 Liters) — Family Reserve',
      images: [
        { url: '/images/Plastic_bottle_on_wooden_table_202608270227 (2).jpeg', altText: 'Eco Galaxy 5 Liter Floor Cleaner Family Pack' },
        { url: '/images/Plastic_bottle_on_wooden_table_202608270227.jpeg', altText: 'Eco Galaxy 1 Liter Bottle' },
        { url: '/images/Plastic_bottle_on_wooden_table_202608270227 (4).jpeg', altText: 'Eco Galaxy Floor Cleaner Bottles Display' },
      ],
    },
  ];

  for (const p of productsData) {
    const existingProduct = await prisma.product.findUnique({
      where: { slug: p.slug },
    });

    if (!existingProduct) {
      await prisma.product.create({
        data: {
          name: p.name,
          slug: p.slug,
          description: p.description,
          price: p.price,
          comparePrice: p.comparePrice,
          status: ProductStatus.ACTIVE,
          seoTitle: `${p.name} | Eco Galaxy Pakistan`,
          seoDescription: `Buy ${p.name} online with Free Delivery and Cash on Delivery across Pakistan.`,
          categories: {
            create: {
              categoryId: category.id,
            },
          },
          variants: {
            create: {
              sku: p.sku,
              title: p.variantTitle,
              price: p.price,
              comparePrice: p.comparePrice,
              inventoryQty: 500,
            },
          },
          images: {
            create: p.images.map((img, idx) => ({
              url: img.url,
              altText: img.altText,
              position: idx,
              isPrimary: idx === 0,
            })),
          },
        },
      });
      console.log(`   ✓ Created product: ${p.name} (${p.slug})`);
    } else {
      await prisma.product.update({
        where: { id: existingProduct.id },
        data: {
          name: p.name,
          description: p.description,
          price: p.price,
          comparePrice: p.comparePrice,
          status: ProductStatus.ACTIVE,
        },
      });
      console.log(`   ✓ Updated product: ${p.name} (${p.slug})`);
    }
  }

  // Seed FAQ Items
  console.log('❓ Seeding FAQ Items...');
  const faqItems = [
    {
      question: 'What bottle sizes and pack options are available?',
      answer: 'Eco Galaxy is packaged in standard 1 Liter bottles. You can choose the 1 Liter Starter Pack (Rs. 649), the 3 Liters Value Pack (Rs. 1,499 — Save 35%), or the 5 Liters Best-Value Pack (Rs. 2,299) with Free Delivery across Pakistan.',
      category: 'Ordering & Packs',
      sortOrder: 1,
    },
    {
      question: 'How do I use and dilute Eco Galaxy Floor Cleaner?',
      answer: 'Add 1 to 2 capfuls of Eco Galaxy into a standard half-bucket (approx. 4–5 liters) of water. Mop your floor normally. No extra rinsing is required, and the floor will dry streak-free with a pleasant lavender aroma.',
      category: 'Usage & Directions',
      sortOrder: 2,
    },
    {
      question: 'Do you offer Cash on Delivery across Pakistan?',
      answer: 'Yes! We provide Cash on Delivery all across Pakistan, including Lahore, Karachi, Islamabad, Rawalpindi, Faisalabad, Multan, Peshawar, Quetta, and all other major cities and towns. You only pay when your parcel arrives.',
      category: 'Shipping & Payment',
      sortOrder: 3,
    },
    {
      question: 'Is it safe for marble, tile, ceramic, and wooden floors?',
      answer: 'Yes. Eco Galaxy Floor Cleaner is specially balanced to be safe and gentle on polished marble, granite, ceramic tiles, terrazzo, and sealed hardwood flooring without leaving residue or dulling surface gloss.',
      category: 'Surfaces & Safety',
      sortOrder: 4,
    },
    {
      question: 'How long does delivery take?',
      answer: 'Orders are dispatched within 24 hours. Delivery typically takes 2 to 4 business days depending on your destination city.',
      category: 'Shipping & Payment',
      sortOrder: 5,
    },
    {
      question: 'How do I contact customer support or order via WhatsApp?',
      answer: 'You can tap the WhatsApp button on our site or message us directly at 0346 4815775 for quick order booking, order tracking, or product advice.',
      category: 'Support',
      sortOrder: 6,
    },
  ];

  for (const faq of faqItems) {
    const existing = await prisma.faqItem.findFirst({
      where: { question: faq.question },
    });
    if (!existing) {
      await prisma.faqItem.create({
        data: {
          question: faq.question,
          answer: faq.answer,
          category: faq.category,
          sortOrder: faq.sortOrder,
          isActive: true,
        },
      });
    }
  }

  // Seed CMS Static Pages
  console.log('📄 Seeding CMS Static Pages...');
  const pages = [
    {
      slug: 'about-us',
      title: 'About Eco Galaxy',
      bodyHtml: `<h2>Thoughtful Floor Care, Made Simple</h2>
<p>Eco Galaxy is a Pakistan-focused floor-care brand built around one clear idea: make everyday floor cleaning easier, more effective, and delightfully fragrant.</p>
<h3>What is Eco Galaxy?</h3>
<p>Eco Galaxy Floor Cleaner is a 1 Liter lavender-fragrance floor-cleaning product crafted for sparkling clean floors, deep stain removal, and a soothing scent that lingers for hours.</p>
<h3>Why Choose Eco Galaxy?</h3>
<p>We keep everything straightforward: clear bottle sizes, transparent pricing, 100% Free Nationwide Delivery, Cash on Delivery, and direct WhatsApp support.</p>`,
      seoTitle: 'About Us | Eco Galaxy Floor Care',
      seoDescription: 'Learn about Eco Galaxy Floor Cleaner and our commitment to spotless, fragrant floors across Pakistan.',
    },
    {
      slug: 'shipping-policy',
      title: 'Shipping Policy',
      bodyHtml: `<h2>Free Delivery Across Pakistan</h2>
<p>All listed offers on Eco Galaxy come with <strong>100% Free Nationwide Delivery</strong>.</p>
<h3>Order Processing & Dispatch</h3>
<p>Orders placed before 4:00 PM PKT are processed and prepared for courier dispatch on the same or next business day.</p>
<h3>Delivery Timelines</h3>
<ul>
  <li><strong>Major Metros (Lahore, Karachi, Islamabad, Rawalpindi):</strong> 2–3 business days</li>
  <li><strong>Other Cities & Regional Hubs:</strong> 3–4 business days</li>
</ul>
<h3>Cash on Delivery (COD)</h3>
<p>We offer seamless Cash on Delivery on all orders. Please have the exact payment ready when the courier arrives.</p>`,
      seoTitle: 'Shipping Policy | Eco Galaxy Pakistan',
      seoDescription: 'Free delivery timelines and Cash on Delivery details for Eco Galaxy orders across Pakistan.',
    },
    {
      slug: 'returns',
      title: 'Returns & Replacement Policy',
      bodyHtml: `<h2>Customer Satisfaction Guarantee</h2>
<p>We take pride in the quality and packaging of Eco Galaxy Floor Cleaner. If your parcel arrives damaged or leaking, we provide hassle-free replacements.</p>
<h3>Damaged in Transit</h3>
<p>If your bottle was damaged during transit, please contact us on WhatsApp at <strong>0346 4815775</strong> within 48 hours of delivery with a photo of the parcel, and our team will dispatch a replacement immediately.</p>`,
      seoTitle: 'Returns & Replacement | Eco Galaxy Pakistan',
      seoDescription: 'Hassle-free replacement policy for Eco Galaxy Floor Cleaner orders.',
    },
    {
      slug: 'privacy',
      title: 'Privacy Policy',
      bodyHtml: `<h2>Your Privacy Matters</h2>
<p>At Eco Galaxy, we respect your privacy and protect your personal information. When you place an order, we collect only the necessary details (Name, Delivery Address, Phone Number) required to fulfill your shipment and provide courier updates.</p>`,
      seoTitle: 'Privacy Policy | Eco Galaxy',
      seoDescription: 'Privacy policy and data protection guidelines for Eco Galaxy customers.',
    },
    {
      slug: 'terms',
      title: 'Terms of Service',
      bodyHtml: `<h2>Terms of Service</h2>
<p>By using this website and ordering from Eco Galaxy, you agree to our standard terms of service. Products should be used according to the dilution directions printed on the bottle label.</p>`,
      seoTitle: 'Terms of Service | Eco Galaxy',
      seoDescription: 'Terms of service and usage conditions for Eco Galaxy.',
    },
  ];

  for (const page of pages) {
    await prisma.page.upsert({
      where: { slug: page.slug },
      update: {
        title: page.title,
        bodyHtml: page.bodyHtml,
        status: PageStatus.ACTIVE,
        seoTitle: page.seoTitle,
        seoDescription: page.seoDescription,
      },
      create: {
        slug: page.slug,
        title: page.title,
        bodyHtml: page.bodyHtml,
        status: PageStatus.ACTIVE,
        seoTitle: page.seoTitle,
        seoDescription: page.seoDescription,
      },
    });
  }

  console.log('\n=============================================================================');
  console.log('✅ Eco Galaxy Seed Complete!');
  console.log('=============================================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
