"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.socialLogin = exports.registerUser = exports.authUser = void 0;
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = require("../config/db");
const generateToken_1 = __importDefault(require("../utils/generateToken"));
// @desc    Auth user & get token
const authUser = (0, express_async_handler_1.default)(async (req, res) => {
    const { email, password } = req.body;
    console.log(`Login attempt: ${email}`);
    const user = await db_1.prisma.user.findUnique({ where: { email } });
    if (user && (await bcryptjs_1.default.compare(password, user.passwordHash))) {
        res.json({
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            avatarUrl: user.avatarUrl,
            token: (0, generateToken_1.default)(user.id),
        });
    }
    else {
        res.status(401);
        throw new Error('Invalid email or password');
    }
});
exports.authUser = authUser;
// @desc    Register a new user
const registerUser = (0, express_async_handler_1.default)(async (req, res) => {
    const { fullName, email, password, role } = req.body;
    const userExists = await db_1.prisma.user.findUnique({ where: { email } });
    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }
    const salt = await bcryptjs_1.default.genSalt(10);
    const passwordHash = await bcryptjs_1.default.hash(password, salt);
    const user = await db_1.prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
            data: {
                fullName,
                email,
                passwordHash,
                role: role?.toUpperCase() || 'STUDENT',
            },
        });
        if (newUser.role === 'INSTRUCTOR') {
            await tx.instructor.create({
                data: { userId: newUser.id }
            });
        }
        return newUser;
    });
    if (user) {
        res.status(201).json({
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            token: (0, generateToken_1.default)(user.id),
        });
    }
    else {
        res.status(400);
        throw new Error('Invalid user data');
    }
});
exports.registerUser = registerUser;
// @desc    Handle social login
const socialLogin = (0, express_async_handler_1.default)(async (req, res) => {
    const { email, fullName, avatarUrl } = req.body;
    let user = await db_1.prisma.user.findUnique({ where: { email } });
    if (!user) {
        // Create new user for social login
        // Since it's social login, we don't have a password, so we create a random/dummy one
        const salt = await bcryptjs_1.default.genSalt(10);
        const passwordHash = await bcryptjs_1.default.hash(Math.random().toString(36), salt);
        user = await db_1.prisma.user.create({
            data: {
                fullName,
                email,
                passwordHash,
                avatarUrl,
                role: 'STUDENT', // Default role for social login
            },
        });
    }
    res.json({
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        token: (0, generateToken_1.default)(user.id),
    });
});
exports.socialLogin = socialLogin;
