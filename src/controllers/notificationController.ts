import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { prisma } from '../config/db';

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
const getNotifications = asyncHandler(async (req: Request, res: Response) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  res.json(notifications);
});

// @desc    Mark notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  const notification = await prisma.notification.findUnique({
    where: { id },
  });

  if (!notification || notification.userId !== req.user.id) {
    res.status(404);
    throw new Error('Notification not found');
  }

  const updatedNotification = await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });

  res.json(updatedNotification);
});

// @desc    Mark all as read
// @route   PATCH /api/notifications/read-all
// @access  Private
const markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
  await prisma.notification.updateMany({
    where: { userId: req.user.id, isRead: false },
    data: { isRead: true },
  });

  res.json({ message: 'All notifications marked as read' });
});

export { getNotifications, markAsRead, markAllAsRead };
