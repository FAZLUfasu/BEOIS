from datetime import date, datetime, time

from django.db import transaction
from django.utils import timezone

from .models import Task
from .services import create_notification, notify_task_assigned


OPEN_TASK_STATUSES = (
    Task.Status.PENDING,
    Task.Status.IN_PROGRESS,
)


def normalize_due_at(value):
    if value is None:
        return None

    if isinstance(value, datetime):
        if timezone.is_naive(value):
            return timezone.make_aware(
                value,
                timezone.get_current_timezone(),
            )
        return value

    if isinstance(value, date):
        value = datetime.combine(
            value,
            time(23, 59, 59),
        )
        return timezone.make_aware(
            value,
            timezone.get_current_timezone(),
        )

    return value


def source_id(value):
    return str(value or "")


@transaction.atomic
def sync_linked_task(
    *,
    source_module,
    source_object_id,
    assigned_to,
    title,
    description="",
    due_at=None,
    reminder_at=None,
    priority=Task.Priority.NORMAL,
    source_label="",
    assigned_by=None,
):
    source_object_id = source_id(source_object_id)
    source_label = (source_label or "").strip()

    if not source_object_id:
        return None

    if assigned_to is None:
        return None

    if not assigned_to.is_active:
        return None

    due_at = normalize_due_at(due_at)
    reminder_at = normalize_due_at(reminder_at)

    if (
        reminder_at is not None
        and due_at is not None
        and reminder_at > due_at
    ):
        reminder_at = due_at

    task = (
        Task.objects
        .select_for_update()
        .filter(
            source_module=source_module,
            source_object_id=source_object_id,
            source_label=source_label,
            status__in=OPEN_TASK_STATUSES,
        )
        .order_by("-created_at")
        .first()
    )

    if task is None:
        task = Task.objects.create(
            title=title.strip(),
            description=(description or "").strip(),
            assigned_to=assigned_to,
            assigned_by=assigned_by,
            priority=priority,
            status=Task.Status.PENDING,
            due_at=due_at,
            reminder_at=reminder_at,
            source_module=source_module,
            source_object_id=source_object_id,
            source_label=source_label,
        )

        notify_task_assigned(task)
        return task

    old_assignee = task.assigned_to_id

    task.title = title.strip()
    task.description = (description or "").strip()
    task.assigned_to = assigned_to

    if assigned_by is not None:
        task.assigned_by = assigned_by

    task.priority = priority
    task.due_at = due_at
    task.reminder_at = reminder_at

    task.save(
        update_fields=[
            "title",
            "description",
            "assigned_to",
            "assigned_by",
            "priority",
            "due_at",
            "reminder_at",
            "updated_at",
        ]
    )

    if old_assignee != task.assigned_to_id:
        notify_task_assigned(task)

    return task


@transaction.atomic
def complete_linked_task(
    *,
    source_module,
    source_object_id,
    source_label="",
):
    now = timezone.now()

    return (
        Task.objects
        .select_for_update()
        .filter(
            source_module=source_module,
            source_object_id=source_id(source_object_id),
            source_label=(source_label or "").strip(),
            status__in=OPEN_TASK_STATUSES,
        )
        .update(
            status=Task.Status.COMPLETED,
            completed_at=now,
            updated_at=now,
        )
    )


@transaction.atomic
def cancel_linked_task(
    *,
    source_module,
    source_object_id,
    source_label="",
):
    now = timezone.now()

    return (
        Task.objects
        .select_for_update()
        .filter(
            source_module=source_module,
            source_object_id=source_id(source_object_id),
            source_label=(source_label or "").strip(),
            status__in=OPEN_TASK_STATUSES,
        )
        .update(
            status=Task.Status.CANCELLED,
            completed_at=None,
            updated_at=now,
        )
    )


def notify_business_event(
    *,
    recipient,
    title,
    message="",
    notification_type=None,
    source_module=Task.SourceModule.GENERAL,
    source_object_id="",
    action_url="",
):
    if recipient is None:
        return None

    kwargs = {
        "recipient": recipient,
        "title": title,
        "message": message,
        "source_module": source_module,
        "source_object_id": source_id(source_object_id),
        "action_url": action_url,
    }

    if notification_type is not None:
        kwargs["notification_type"] = notification_type

    return create_notification(**kwargs)
