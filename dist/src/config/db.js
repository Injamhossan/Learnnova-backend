"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = exports.prisma = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
exports.prisma = prisma;
const connectDB = async () => {
    let retries = 5;
    while (retries > 0) {
        try {
            await prisma.$connect();
            console.log('PostgreSQL Connected via Prisma');
            return;
        }
        catch (error) {
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
exports.connectDB = connectDB;
