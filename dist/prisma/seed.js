"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const prisma = new client_1.PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL,
        },
    },
});
async function main() {
    console.log('🌱 Seeding Super Admin for Learnova...\n');
    const email = 'admin@learnnova.com';
    const password = 'learnnova123';
    // Check if already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        console.log(`✅ Super Admin already exists: ${email}`);
        console.log(`🆔 ID: ${existing.id}`);
        await prisma.$disconnect();
        return;
    }
    const passwordHash = await bcryptjs_1.default.hash(password, 12);
    const admin = await prisma.user.create({
        data: {
            email,
            passwordHash,
            fullName: 'Learnova Owner',
            role: 'ADMIN',
            isEmailVerified: true,
            isActive: true,
        },
    });
    console.log('🎉 Super Admin Created Successfully!');
    console.log('━'.repeat(40));
    console.log(`📧 Email    : ${admin.email}`);
    console.log(`🔑 Password : ${password}`);
    console.log(`👤 Name     : ${admin.fullName}`);
    console.log(`🛡️  Role     : ${admin.role}`);
    console.log(`🆔 ID       : ${admin.id}`);
    console.log('━'.repeat(40));
    console.log('⚠️  Keep these credentials safe!\n');
    await prisma.$disconnect();
}
main().catch((e) => {
    console.error('❌ Seed failed:', e.message);
    process.exit(1);
});
