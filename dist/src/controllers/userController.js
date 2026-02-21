"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUsers = void 0;
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const db_1 = require("../config/db");
// @desc    Get all users
const getUsers = (0, express_async_handler_1.default)(async (req, res) => {
    const users = await db_1.prisma.user.findMany({
        select: { id: true, fullName: true, email: true, role: true, createdAt: true },
    });
    res.json(users);
});
exports.getUsers = getUsers;
