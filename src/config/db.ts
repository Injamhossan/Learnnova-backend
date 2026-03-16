import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const connectDB = async (): Promise<void> => {
  let retries = 5;
  while (retries > 0) {
    try {
      await prisma.$connect();
      console.log('PostgreSQL Connected via Prisma');
      return;
    } catch (error: any) {
      console.warn(`PostgreSQL Connection failed (Retrying in 5s, ${retries - 1} left): ${error.message}`);
      retries--;
      if (retries === 0) {
        console.error('Max database connection retries reached. Exiting.');
        process.exit(1);
      }
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
};

export { prisma, connectDB };
