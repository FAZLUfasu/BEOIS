from django.core.management.base import BaseCommand
from django.utils import timezone
from notifications.reminder_engine import process_task_reminders

class Command(BaseCommand):
    help = "Process due BEOIS task reminders and first-time overdue alerts."

    def handle(self, *args, **options):
        now=timezone.now()
        result=process_task_reminders(now=now)
        self.stdout.write(self.style.SUCCESS("BEOIS TASK REMINDER PROCESSING COMPLETE"))
        self.stdout.write(f"Reminders sent : {result['reminders_sent']}")
        self.stdout.write(f"Overdue alerts : {result['overdue_sent']}")
        self.stdout.write(f"Total created  : {result['processed']}")
