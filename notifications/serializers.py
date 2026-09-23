from django.utils import timezone
from rest_framework import serializers

from accounts.models import User

from .models import Notification, Task
from .services import (
    notify_task_assigned,
    notify_task_completed,
)


class TaskUserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "full_name",
            "profile_picture",
        ]

    def get_full_name(self, obj):
        return obj.get_full_name().strip() or obj.username


class TaskSerializer(serializers.ModelSerializer):
    assigned_to_detail = TaskUserSerializer(
        source="assigned_to",
        read_only=True,
    )

    assigned_by_detail = TaskUserSerializer(
        source="assigned_by",
        read_only=True,
    )

    is_overdue = serializers.BooleanField(
        read_only=True,
    )

    class Meta:
        model = Task

        fields = [
            "id",
            "title",
            "description",
            "assigned_to",
            "assigned_to_detail",
            "assigned_by",
            "assigned_by_detail",
            "priority",
            "status",
            "due_at",
            "reminder_at",
            "source_module",
            "source_object_id",
            "source_label",
            "completed_at",
            "is_overdue",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "assigned_by",
            "completed_at",
            "created_at",
            "updated_at",
        ]

    def validate_assigned_to(self, value):
        if not value.is_active:
            raise serializers.ValidationError(
                "Tasks cannot be assigned to an inactive user."
            )

        return value

    def validate(self, attrs):
        due_at = attrs.get(
            "due_at",
            getattr(self.instance, "due_at", None),
        )

        reminder_at = attrs.get(
            "reminder_at",
            getattr(self.instance, "reminder_at", None),
        )

        if (
            due_at
            and reminder_at
            and reminder_at > due_at
        ):
            raise serializers.ValidationError(
                {
                    "reminder_at": (
                        "Reminder time cannot be after "
                        "the task due time."
                    )
                }
            )

        return attrs

    def create(self, validated_data):
        request = self.context["request"]

        validated_data["assigned_by"] = request.user

        task = super().create(validated_data)

        notify_task_assigned(task)

        return task

    def update(self, instance, validated_data):
        old_status = instance.status
        old_assigned_to_id = instance.assigned_to_id

        instance = super().update(
            instance,
            validated_data,
        )

        completed_now = (
            instance.status == Task.Status.COMPLETED
            and old_status != Task.Status.COMPLETED
        )

        reopened = (
            old_status == Task.Status.COMPLETED
            and instance.status != Task.Status.COMPLETED
        )

        if completed_now:
            instance.completed_at = timezone.now()

            instance.save(
                update_fields=[
                    "completed_at",
                    "updated_at",
                ]
            )

            notify_task_completed(instance)

        elif reopened:
            instance.completed_at = None

            instance.save(
                update_fields=[
                    "completed_at",
                    "updated_at",
                ]
            )

        if (
            instance.assigned_to_id
            != old_assigned_to_id
        ):
            notify_task_assigned(instance)

        return instance


class MyTaskUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task

        fields = [
            "status",
        ]

    def validate_status(self, value):
        allowed = {
            Task.Status.PENDING,
            Task.Status.IN_PROGRESS,
            Task.Status.COMPLETED,
        }

        if value not in allowed:
            raise serializers.ValidationError(
                "You can only mark your task as pending, "
                "in progress, or completed."
            )

        return value

    def update(self, instance, validated_data):
        old_status = instance.status

        instance.status = validated_data["status"]

        completed_now = (
            instance.status == Task.Status.COMPLETED
            and old_status != Task.Status.COMPLETED
        )

        reopened = (
            old_status == Task.Status.COMPLETED
            and instance.status != Task.Status.COMPLETED
        )

        if completed_now:
            instance.completed_at = timezone.now()

        elif reopened:
            instance.completed_at = None

        instance.save(
            update_fields=[
                "status",
                "completed_at",
                "updated_at",
            ]
        )

        if completed_now:
            notify_task_completed(instance)

        return instance


class NotificationSerializer(serializers.ModelSerializer):
    task_title = serializers.CharField(
        source="task.title",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = Notification

        fields = [
            "id",
            "notification_type",
            "title",
            "message",
            "task",
            "task_title",
            "source_module",
            "source_object_id",
            "action_url",
            "is_read",
            "read_at",
            "created_at",
        ]

        read_only_fields = fields