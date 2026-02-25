"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAllAsRead = exports.markAsRead = exports.getNotifications = void 0;
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const db_1 = require("../config/db");
// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
const getNotifications = (0, express_async_handler_1.default)(async (req, res) => {
    const notifications = await db_1.prisma.notification.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
    });
    res.json(notifications);
});
exports.getNotifications = getNotifications;
// @desc    Mark notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
const markAsRead = (0, express_async_handler_1.default)(async (req, res) => {
    const id = req.params['id'];
    const notification = await db_1.prisma.notification.findUnique({
        where: { id },
    });
    if (!notification || notification.userId !== req.user.id) {
        res.status(404);
        throw new Error('Notification not found');
    }
    const updatedNotification = await db_1.prisma.notification.update({
        where: { id },
        data: { isRead: true },
    });
    res.json(updatedNotification);
});
exports.markAsRead = markAsRead;
// @desc    Mark all as read
// @route   PATCH /api/notifications/read-all
// @access  Private
const markAllAsRead = (0, express_async_handler_1.default)(async (req, res) => {
    await db_1.prisma.notification.updateMany({
        where: { userId: req.user.id, isRead: false },
        data: { isRead: true },
    });
    res.json({ message: 'All notifications marked as read' });
});
exports.markAllAsRead = markAllAsRead;
