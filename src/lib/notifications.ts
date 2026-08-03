import { Notification, User, UserRole } from "@/types";

export const isNotificationVisible = (notification: Notification, user?: User | null, now = new Date()) => {
  if (notification.scheduledFor && new Date(notification.scheduledFor).getTime() > now.getTime()) return false;
  if (notification.forUserId && notification.forUserId !== user?.id) return false;
  return notification.forRole === "all" || notification.forRole === user?.role;
};

export const notificationsForUser = (notifications: Notification[], user?: User | null, now = new Date()) =>
  notifications
    .filter((notification) => isNotificationVisible(notification, user, now))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

export const notificationAudienceLabel = (role: UserRole | "all") =>
  role === "all" ? "Everyone" : role === "hod" ? "Administrators" : `${role.charAt(0).toUpperCase()}${role.slice(1)}s`;
