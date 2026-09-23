from django.db import transaction
from django.utils import timezone
from .models import Notification, Task
from .services import create_notification

OPEN_STATUSES = (Task.Status.PENDING, Task.Status.IN_PROGRESS)

@transaction.atomic
def send_task_reminder(task_id, *, now=None):
    now = now or timezone.now()
    task = Task.objects.select_for_update().select_related("assigned_to").filter(pk=task_id).first()
    if task is None or task.status not in OPEN_STATUSES:
        return None
    if not task.assigned_to_id or not task.assigned_to.is_active:
        return None
    if task.reminder_at is None or task.reminder_at > now or task.reminder_sent_at is not None:
        return None
    notification = create_notification(
        recipient=task.assigned_to, notification_type=Notification.Type.REMINDER,
        title="Task reminder", message=task.title, task=task,
        source_module=task.source_module, source_object_id=task.source_object_id,
        action_url=f"/tasks?task={task.id}",
    )
    task.reminder_sent_at = now
    task.save(update_fields=["reminder_sent_at", "updated_at"])
    return notification

@transaction.atomic
def send_overdue_notification(task_id, *, now=None):
    now = now or timezone.now()
    task = Task.objects.select_for_update().select_related("assigned_to").filter(pk=task_id).first()
    if task is None or task.status not in OPEN_STATUSES:
        return None
    if not task.assigned_to_id or not task.assigned_to.is_active:
        return None
    if task.due_at is None or task.due_at >= now or task.overdue_notified_at is not None:
        return None
    notification = create_notification(
        recipient=task.assigned_to, notification_type=Notification.Type.WARNING,
        title="Task overdue", message=task.title, task=task,
        source_module=task.source_module, source_object_id=task.source_object_id,
        action_url=f"/tasks?task={task.id}",
    )
    task.overdue_notified_at = now
    task.save(update_fields=["overdue_notified_at", "updated_at"])
    return notification

def process_task_reminders(*, now=None):
    now = now or timezone.now()
    reminder_ids = list(Task.objects.filter(
        status__in=OPEN_STATUSES, reminder_at__isnull=False, reminder_at__lte=now,
        reminder_sent_at__isnull=True, assigned_to__is_active=True
    ).values_list("pk", flat=True))
    overdue_ids = list(Task.objects.filter(
        status__in=OPEN_STATUSES, due_at__isnull=False, due_at__lt=now,
        overdue_notified_at__isnull=True, assigned_to__is_active=True
    ).values_list("pk", flat=True))
    reminders_sent=sum(send_task_reminder(i,now=now) is not None for i in reminder_ids)
    overdue_sent=sum(send_overdue_notification(i,now=now) is not None for i in overdue_ids)
    return {"reminders_sent":reminders_sent,"overdue_sent":overdue_sent,"processed":reminders_sent+overdue_sent}
