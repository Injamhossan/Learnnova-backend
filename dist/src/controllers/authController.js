"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = exports.forgotPassword = exports.socialLogin = exports.registerUser = exports.authUser = void 0;
const crypto_1 = __importDefault(require("crypto"));
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = require("../config/db");
const generateToken_1 = __importDefault(require("../utils/generateToken"));
const sendEmail_1 = __importDefault(require("../utils/sendEmail"));
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
    let isNewUser = false;
    if (!user) {
        isNewUser = true;
        // Create new user for social login
        const salt = await bcryptjs_1.default.genSalt(10);
        const passwordHash = await bcryptjs_1.default.hash(Math.random().toString(36), salt);
        user = await db_1.prisma.user.create({
            data: {
                fullName,
                email,
                passwordHash,
                avatarUrl,
                role: 'STUDENT', // Default, but can be changed later
            },
        });
    }
    else if (!user.avatarUrl && avatarUrl) {
        // Sync avatar if missing
        user = await db_1.prisma.user.update({
            where: { id: user.id },
            data: { avatarUrl }
        });
    }
    res.json({
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        token: (0, generateToken_1.default)(user.id),
        needsRole: isNewUser, // Flag to tell frontend to show role selection
    });
});
exports.socialLogin = socialLogin;
// @desc    Forgot Password
const forgotPassword = (0, express_async_handler_1.default)(async (req, res) => {
    const { email } = req.body;
    const user = await db_1.prisma.user.findUnique({ where: { email } });
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }
    // Generate Reset Token
    const resetToken = crypto_1.default.randomBytes(20).toString('hex');
    // Hash token and set to resetPasswordToken field
    const hashedToken = crypto_1.default
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
    // Set expires (10 minutes)
    const expires = new Date(Date.now() + 10 * 60 * 1000);
    await db_1.prisma.user.update({
        where: { id: user.id },
        data: {
            resetPasswordToken: hashedToken,
            resetPasswordExpires: expires,
        },
    });
    // Create reset url
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    const message = `
    <h1>Password Reset Request</h1>
    <p>You are receiving this email because you (or someone else) has requested the reset of a password.</p>
    <p>Please click on the following link to complete the process:</p>
    <a href="${resetUrl}" clicktracking=off>${resetUrl}</a>
    <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
  `;
    try {
        await (0, sendEmail_1.default)({
            email: user.email,
            subject: 'Learnova - Password Reset Request',
            message,
        });
        res.status(200).json({ message: 'Email sent' });
    }
    catch (error) {
        await db_1.prisma.user.update({
            where: { id: user.id },
            data: {
                resetPasswordToken: null,
                resetPasswordExpires: null,
            },
        });
        res.status(500);
        throw new Error('Email could not be sent');
    }
});
exports.forgotPassword = forgotPassword;
// @desc    Reset Password
const resetPassword = (0, express_async_handler_1.default)(async (req, res) => {
    const { password } = req.body;
    const { token } = req.params;
    // Hash token to compare with DB
    const hashedToken = crypto_1.default
        .createHash('sha256')
        .update(token)
        .digest('hex');
    const user = await db_1.prisma.user.findFirst({
        where: {
            resetPasswordToken: hashedToken,
            resetPasswordExpires: {
                gt: new Date(),
            },
        },
    });
    if (!user) {
        res.status(400);
        throw new Error('Invalid or expired token');
    }
    // Hash new password
    const salt = await bcryptjs_1.default.genSalt(10);
    const passwordHash = await bcryptjs_1.default.hash(password, salt);
    // Update user
    await db_1.prisma.user.update({
        where: { id: user.id },
        data: {
            passwordHash,
            resetPasswordToken: null,
            resetPasswordExpires: null,
        },
    });
    res.status(200).json({
        message: 'Password reset successful',
        token: (0, generateToken_1.default)(user.id),
    });
});
exports.resetPassword = resetPassword;
