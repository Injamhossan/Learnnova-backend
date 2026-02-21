"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSuperAdmin = exports.isAdmin = exports.isStaff = exports.isInstructor = exports.isStudent = exports.protect = void 0;
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../config/db");
const protect = (0, express_async_handler_1.default)(async (req, res, next) => {
    let token;
    if (req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            req.user = await db_1.prisma.user.findUnique({
                where: { id: decoded.id },
                select: { id: true, fullName: true, email: true, role: true, avatarUrl: true },
            });
            next();
        }
        catch (error) {
            console.error(error);
            res.status(401);
            throw new Error('Not authorized, token failed');
        }
    }
    if (!token) {
        res.status(401);
        throw new Error('Not authorized, no token');
    }
});
exports.protect = protect;
const isInstructor = (0, express_async_handler_1.default)(async (req, res, next) => {
    if (req.user && req.user.role === 'INSTRUCTOR') {
        const instructor = await db_1.prisma.instructor.findUnique({
            where: { userId: req.user.id }
        });
        if (!instructor) {
            res.status(403);
            throw new Error('Instructor profile not found');
        }
        req.instructor = instructor;
        next();
    }
    else {
        res.status(403);
        throw new Error('Access denied. Instructor role required.');
    }
});
exports.isInstructor = isInstructor;
const isStaff = (req, res, next) => {
    if (req.user && (req.user.role === 'INSTRUCTOR' || req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN')) {
        next();
    }
    else {
        res.status(403);
        throw new Error('Access denied. Staff role required.');
    }
};
exports.isStaff = isStaff;
const isAdmin = (req, res, next) => {
    if (req.user && (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN')) {
        next();
    }
    else {
        res.status(403);
        throw new Error('Not authorized as admin');
    }
};
exports.isAdmin = isAdmin;
const isSuperAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'SUPER_ADMIN') {
        next();
    }
    else {
        res.status(403);
        throw new Error('Not authorized as super admin');
    }
};
exports.isSuperAdmin = isSuperAdmin;
const isStudent = (req, res, next) => {
    if (req.user && req.user.role === 'STUDENT') {
        next();
    }
    else {
        res.status(403);
        throw new Error('Access denied. Student role required.');
    }
};
exports.isStudent = isStudent;
