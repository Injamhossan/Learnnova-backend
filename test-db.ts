import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function main() {
  console.log("Attempting database connection with Prisma...");
  try {
    const usersCount = await prisma.user.count();
    console.log(`Connection successful! Total users: ${usersCount}`);
  } catch (err) {
    console.error("Database Connection Failed:");
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
