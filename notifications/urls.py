from django.urls import path

from .views import (
    MyTaskListView,
    MyTaskStatusView,
    NotificationListView,
    NotificationMarkAllReadView,
    NotificationMarkReadView,
    NotificationUnreadCountView,
    TaskDetailView,
    TaskListCreateView,
)


urlpatterns = [
    path(
        "tasks/",
        TaskListCreateView.as_view(),
        name="task-list",
    ),
    path(
        "tasks/<uuid:pk>/",
        TaskDetailView.as_view(),
        name="task-detail",
    ),
    path(
        "my-tasks/",
        MyTaskListView.as_view(),
        name="my-task-list",
    ),
    path(
        "my-tasks/<uuid:pk>/status/",
        MyTaskStatusView.as_view(),
        name="my-task-status",
    ),
    path(
        "",
        NotificationListView.as_view(),
        name="notification-list",
    ),
    path(
        "unread-count/",
        NotificationUnreadCountView.as_view(),
        name="notification-unread-count",
    ),
    path(
        "<uuid:pk>/read/",
        NotificationMarkReadView.as_view(),
        name="notification-mark-read",
    ),
    path(
        "mark-all-read/",
        NotificationMarkAllReadView.as_view(),
        name="notification-mark-all-read",
    ),
]