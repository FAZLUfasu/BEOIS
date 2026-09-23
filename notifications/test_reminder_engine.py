from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from notifications.models import Notification, Task
from notifications.reminder_engine import process_task_reminders

User=get_user_model()

class TaskReminderEngineTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user=User.objects.create_user(username="reminder_staff",email="reminder_staff@example.com",password="TestPass123!",is_active=True)
        cls.inactive=User.objects.create_user(username="inactive_reminder_staff",email="inactive_reminder_staff@example.com",password="TestPass123!",is_active=False)

    def make_task(self,**overrides):
        values={"title":"Reminder test","assigned_to":self.user,"status":Task.Status.PENDING,
                "source_module":Task.SourceModule.GENERAL,"source_object_id":"BLOCK4","source_label":"Block 4"}
        values.update(overrides)
        return Task.objects.create(**values)

    def test_due_reminder_sent_once(self):
        now=timezone.now(); task=self.make_task(reminder_at=now-timezone.timedelta(minutes=1))
        self.assertEqual(process_task_reminders(now=now)["reminders_sent"],1)
        self.assertEqual(process_task_reminders(now=now+timezone.timedelta(minutes=1))["reminders_sent"],0)
        task.refresh_from_db(); self.assertIsNotNone(task.reminder_sent_at)
        self.assertEqual(Notification.objects.filter(task=task,notification_type=Notification.Type.REMINDER).count(),1)

    def test_future_reminder_not_sent(self):
        now=timezone.now(); task=self.make_task(reminder_at=now+timezone.timedelta(hours=1))
        self.assertEqual(process_task_reminders(now=now)["reminders_sent"],0)
        task.refresh_from_db(); self.assertIsNone(task.reminder_sent_at)

    def test_terminal_tasks_skipped(self):
        now=timezone.now()
        a=self.make_task(status=Task.Status.COMPLETED,reminder_at=now-timezone.timedelta(minutes=1))
        b=self.make_task(status=Task.Status.CANCELLED,reminder_at=now-timezone.timedelta(minutes=1))
        self.assertEqual(process_task_reminders(now=now)["processed"],0)
        self.assertFalse(Notification.objects.filter(task__in=[a,b]).exists())

    def test_inactive_assignee_skipped(self):
        now=timezone.now(); task=self.make_task(assigned_to=self.inactive,reminder_at=now-timezone.timedelta(minutes=1))
        self.assertEqual(process_task_reminders(now=now)["processed"],0)
        self.assertFalse(Notification.objects.filter(task=task).exists())

    def test_overdue_alert_sent_once(self):
        now=timezone.now(); task=self.make_task(due_at=now-timezone.timedelta(minutes=5))
        self.assertEqual(process_task_reminders(now=now)["overdue_sent"],1)
        self.assertEqual(process_task_reminders(now=now+timezone.timedelta(minutes=1))["overdue_sent"],0)
        task.refresh_from_db(); self.assertIsNotNone(task.overdue_notified_at)
        self.assertEqual(Notification.objects.filter(task=task,title="Task overdue").count(),1)

    def test_reminder_and_overdue_can_both_fire(self):
        now=timezone.now(); task=self.make_task(reminder_at=now-timezone.timedelta(minutes=10),due_at=now-timezone.timedelta(minutes=5))
        result=process_task_reminders(now=now)
        self.assertEqual(result["reminders_sent"],1); self.assertEqual(result["overdue_sent"],1)
        self.assertEqual(Notification.objects.filter(task=task).count(),2)
