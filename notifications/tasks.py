from celery import shared_task

from .reminder_engine import process_task_reminders


@shared_task(
    name="notifications.process_task_reminders",
    ignore_result=True,
)
def process_task_reminders_task():
    """
    Celery entry point for BEOIS automatic reminders.

    Reminder business logic intentionally remains in
    notifications.reminder_engine.process_task_reminders().
    """
    return process_task_reminders()
