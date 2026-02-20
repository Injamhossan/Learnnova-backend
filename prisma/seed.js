const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Super Admin...');

  const email = 'admin@learnova.com';
  const password = 'Admin@Learnova2024!';

  // Check if already exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`✅ Super Admin already exists: ${email}`);
    await prisma.$disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName: 'Learnova Admin',
      role: 'ADMIN',
      isEmailVerified: true,
      isActive: true,
    },
  });

  console.log('');
  console.log('🎉 Super Admin Created Successfully!');
  console.log('━'.repeat(40));
  console.log(`📧 Email    : ${admin.email}`);
  console.log(`🔑 Password : ${password}`);
  console.log(`👤 Name     : ${admin.fullName}`);
  console.log(`🛡️  Role     : ${admin.role}`);
  console.log(`🆔 ID       : ${admin.id}`);
  console.log('━'.repeat(40));
  console.log('⚠️  Please change the password after first login!');
  console.log('');

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('❌ Seed failed:', e);
  process.exit(1);
});
