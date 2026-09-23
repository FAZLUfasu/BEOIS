import { apiRequest } from "@/lib/api/client";

import type {
  BeoisNotification,
  MarkAllReadResponse,
  NotificationUnreadCount,
} from "@/types/notifications";


export function getNotifications(options?: {
  unreadOnly?: boolean;
}) {
  const query = options?.unreadOnly
    ? "?unread=true"
    : "";

  return apiRequest<BeoisNotification[]>(
    `/notifications/${query}`,
  );
}


export function getUnreadNotificationCount() {
  return apiRequest<NotificationUnreadCount>(
    "/notifications/unread-count/",
  );
}


export function markNotificationRead(
  notificationId: string,
) {
  return apiRequest<BeoisNotification>(
    `/notifications/${notificationId}/read/`,
    {
      method: "POST",
    },
  );
}


export function markAllNotificationsRead() {
  return apiRequest<MarkAllReadResponse>(
    "/notifications/mark-all-read/",
    {
      method: "POST",
    },
  );
}