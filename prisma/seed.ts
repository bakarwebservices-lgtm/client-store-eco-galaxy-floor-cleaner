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
