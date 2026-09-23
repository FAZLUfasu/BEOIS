import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class Task(models.Model):
    class Priority(models.TextChoices):
        LOW = "LOW", "Low"
        NORMAL = "NORMAL", "Normal"
        HIGH = "HIGH", "High"
        URGENT = "URGENT", "Urgent"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"

    class SourceModule(models.TextChoices):
        GENERAL = "GENERAL", "General"
        LEADS = "LEADS", "Leads"
        ADMISSIONS = "ADMISSIONS", "Admissions"
        STUDENTS = "STUDENTS", "Students"
        PARTNERS = "PARTNERS", "Partner Network"
        FINANCE = "FINANCE", "Finance"
        HR = "HR", "HR & Payroll"
        EDUCATION = "EDUCATION", "Education Process"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    title = models.CharField(max_length=255)

    description = models.TextField(blank=True)

    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="assigned_tasks",
    )

    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="created_tasks",
        null=True,
        blank=True,
    )

    priority = models.CharField(
        max_length=20,
        choices=Priority.choices,
        default=Priority.NORMAL,
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )

    due_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    reminder_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    source_module = models.CharField(
        max_length=30,
        choices=SourceModule.choices,
        default=SourceModule.GENERAL,
    )

    source_object_id = models.CharField(
        max_length=100,
        blank=True,
    )

    source_label = models.CharField(
        max_length=255,
        blank=True,
    )

    completed_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = [
            "status",
            "due_at",
            "-created_at",
        ]

        indexes = [
            models.Index(
                fields=["assigned_to", "status"],
                name="notif_task_user_status_idx",
            ),
            models.Index(
                fields=["due_at"],
                name="notif_task_due_idx",
            ),
            models.Index(
                fields=["source_module"],
                name="notif_task_source_idx",
            ),
        ]

    def __str__(self):
        return self.title

    @property
    def is_overdue(self):
        return bool(
            self.due_at
            and self.status
            not in {
                self.Status.COMPLETED,
                self.Status.CANCELLED,
            }
            and self.due_at < timezone.now()
        )


class Notification(models.Model):
    class Type(models.TextChoices):
        INFO = "INFO", "Information"
        SUCCESS = "SUCCESS", "Success"
        WARNING = "WARNING", "Warning"
        REMINDER = "REMINDER", "Reminder"
        TASK = "TASK", "Task"
        SYSTEM = "SYSTEM", "System"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )

    notification_type = models.CharField(
        max_length=20,
        choices=Type.choices,
        default=Type.INFO,
    )

    title = models.CharField(
        max_length=255,
    )

    message = models.TextField(
        blank=True,
    )

    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name="notifications",
        null=True,
        blank=True,
    )

    source_module = models.CharField(
        max_length=30,
        choices=Task.SourceModule.choices,
        default=Task.SourceModule.GENERAL,
    )

    source_object_id = models.CharField(
        max_length=100,
        blank=True,
    )

    action_url = models.CharField(
        max_length=500,
        blank=True,
    )

    is_read = models.BooleanField(
        default=False,
    )

    read_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["-created_at"]

        indexes = [
            models.Index(
                fields=["recipient", "is_read"],
                name="notif_recipient_read_idx",
            ),
            models.Index(
                fields=["created_at"],
                name="notif_created_idx",
            ),
        ]

    def __str__(self):
        return f"{self.recipient} - {self.title}"

    def mark_read(self):
        if self.is_read:
            return

        self.is_read = True
        self.read_at = timezone.now()

        self.save(
            update_fields=[
                "is_read",
                "read_at",
            ]
        )