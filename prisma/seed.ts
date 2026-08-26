import { PrismaClient, AdminRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

function generateSecureRandomPassword(length = 16): string {
  // Generates high-entropy base64url string without ambiguous characters
  return crypto.randomBytes(length).toString('base64url').slice(0, length);
}

async function main() {
  const isCustomPassword = Boolean(process.env.INITIAL_ADMIN_PASSWORD);
  const adminEmail = (process.env.INITIAL_ADMIN_EMAIL || 'admin@store.com').toLowerCase().trim();
  const adminName = process.env.INITIAL_ADMIN_NAME || 'Store Administrator';
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || generateSecureRandomPassword(16);

  console.log('\n=============================================================================');
  console.log('🌱 AWWeb Template — Initial Admin User Seeder');
  console.log('=============================================================================');

  const existingAdmin = await prisma.adminUser.findUnique({
    where: { email: adminEmail },
  });

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  if (existingAdmin) {
    console.log(`ℹ️ Admin user (${adminEmail}) already exists. Resetting credentials and ensuring role is ADMIN...`);
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

  /**
   * CRITICAL DEPLOYMENT NOTE (BUILD_STANDARDS 1.6 & 2.7):
   * Default store settings below (store.currency, store.country, shipping thresholds)
   * MUST be reviewed and adjusted for each new client deployment before running seed.
   */
  const defaultSettings = [
    { key: 'store.currency', value: process.env.INITIAL_STORE_CURRENCY || 'PKR', description: 'Store base currency code (e.g. PKR, USD, EUR, GBP)' },
    { key: 'store.country', value: process.env.INITIAL_STORE_COUNTRY || 'Pakistan', description: 'Store operating country' },
    { key: 'shipping.free_threshold', value: Number(process.env.INITIAL_FREE_SHIPPING_THRESHOLD) || 5000, description: 'Free shipping qualifying order subtotal' },
    { key: 'shipping.standard_cost', value: Number(process.env.INITIAL_STANDARD_SHIPPING_COST) || 250, description: 'Standard flat rate shipping fee' },
    { key: 'store.name', value: process.env.INITIAL_STORE_NAME || 'AWWeb SaaS Template Store', description: 'Store display name' },
    { key: 'store.email', value: process.env.INITIAL_STORE_EMAIL || 'support@store.com', description: 'Store public customer support email' },
    { key: 'store.phone', value: process.env.INITIAL_STORE_PHONE || '+92 300 0000000', description: 'Store public contact phone / WhatsApp' },
    { key: 'store.address', value: process.env.INITIAL_STORE_ADDRESS || 'Lahore, Punjab, Pakistan', description: 'Store physical / operating address' },
    { key: 'store.hours', value: process.env.INITIAL_STORE_HOURS || 'Mon – Sat: 10:00 AM – 8:00 PM PKT', description: 'Customer support business hours' },
    { key: 'tax.rate', value: Number(process.env.INITIAL_TAX_RATE) || 0, description: 'Default sales tax percentage' },
  ];

  console.log('⚙️  Seeding Default Store Settings...');
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

  console.log('\n-----------------------------------------------------------------------------');
  console.log('🔑 INITIAL ADMIN CREDENTIALS');
  console.log('-----------------------------------------------------------------------------');
  console.log(`   Email:    ${adminEmail}`);
  console.log(`   Password: ${adminPassword}`);
  console.log(`   Role:     ADMIN`);
  console.log('-----------------------------------------------------------------------------');

  if (!isCustomPassword) {
    console.log('⚠️  SECURITY WARNING: A random password was generated above.');
    console.log('   Copy and save this password immediately; it will NOT be shown again.');
  } else {
    console.log('⚠️  SECURITY WARNING: Using custom credentials from environment variables.');
  }

  console.log('⚠️  CRITICAL: You MUST change this password before any live/production deployment!');
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
