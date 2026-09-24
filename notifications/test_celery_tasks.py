from unittest.mock import patch

from django.conf import settings
from django.test import SimpleTestCase

from .tasks import process_task_reminders_task


class CeleryReminderTaskTests(SimpleTestCase):
    def test_task_has_stable_name(self):
        self.assertEqual(
            process_task_reminders_task.name,
            "notifications.process_task_reminders",
        )

    @patch("notifications.tasks.process_task_reminders")
    def test_task_delegates_to_existing_reminder_engine(self, engine):
        expected = {
            "reminders_sent": 2,
            "overdue_alerts": 1,
            "total_created": 3,
        }
        engine.return_value = expected

        result = process_task_reminders_task.run()

        engine.assert_called_once_with()
        self.assertEqual(result, expected)

    def test_beat_schedule_runs_reminder_task_every_minute(self):
        entry = settings.CELERY_BEAT_SCHEDULE[
            "beois-process-task-reminders-every-minute"
        ]

        self.assertEqual(
            entry["task"],
            "notifications.process_task_reminders",
        )
        self.assertEqual(entry["schedule"], 60.0)
        self.assertEqual(entry["options"]["expires"], 55)

    def test_celery_uses_project_timezone(self):
        self.assertEqual(settings.CELERY_TIMEZONE, settings.TIME_ZONE)
        self.assertTrue(settings.CELERY_ENABLE_UTC)
