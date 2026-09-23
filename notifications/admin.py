from django.contrib import admin

from .models import Notification, Task


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "assigned_to",
        "assigned_by",
        "priority",
        "status",
        "due_at",
        "source_module",
        "created_at",
    ]

    list_filter = [
        "priority",
        "status",
        "source_module",
    ]

    search_fields = [
        "title",
        "description",
        "assigned_to__username",
        "assigned_to__first_name",
        "assigned_to__last_name",
        "source_label",
    ]

    readonly_fields = [
        "id",
        "completed_at",
        "created_at",
        "updated_at",
    ]


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "recipient",
        "notification_type",
        "is_read",
        "source_module",
        "created_at",
    ]

    list_filter = [
        "notification_type",
        "is_read",
        "source_module",
    ]

    search_fields = [
        "title",
        "message",
        "recipient__username",
        "recipient__first_name",
        "recipient__last_name",
    ]

    readonly_fields = [
        "id",
        "created_at",
    ]