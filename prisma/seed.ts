import { PrismaClient, AdminRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@store.com';
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'AdminPassword123!';
  const adminName = process.env.INITIAL_ADMIN_NAME || 'Store Administrator';

  console.log(`🌱 Seeding initial admin user: ${adminEmail}...`);

  const existingAdmin = await prisma.adminUser.findUnique({
    where: { email: adminEmail.toLowerCase() },
  });

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  if (existingAdmin) {
    console.log(`ℹ️ Admin user already exists. Updating password and ensuring role is ADMIN...`);
    await prisma.adminUser.update({
      where: { id: existingAdmin.id },
      data: {
        passwordHash,
        role: AdminRole.ADMIN,
        name: adminName,
      },
    });
  } else {
    await prisma.adminUser.create({
      data: {
        email: adminEmail.toLowerCase(),
        name: adminName,
        passwordHash,
        role: AdminRole.ADMIN,
      },
    });
  }

  console.log(`✅ Initial admin seeded successfully!`);
  console.log(`   Email: ${adminEmail}`);
  console.log(`   Password: ${adminPassword}`);
  console.log(`   Role: ADMIN`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
