"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
});
async function main() {
    console.log("Attempting database connection with Prisma...");
    try {
        const usersCount = await prisma.user.count();
        console.log(`Connection successful! Total users: ${usersCount}`);
    }
    catch (err) {
        console.error("Database Connection Failed:");
        console.error(err);
    }
    finally {
        await prisma.$disconnect();
    }
}
main();
