from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import Role, UserRole

from .models import Notification, Task


User = get_user_model()


class NotificationTaskAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.manager_role = Role.objects.create(
            name="General Manager Test",
            code="GENERAL_MANAGER",
        )

        self.telecaller_role = Role.objects.create(
            name="Telecaller Test",
            code="TELECALLER",
        )

        self.manager = User.objects.create_user(
            username="notification_manager",
            email="notification.manager@example.com",
            password="TestPass123!",
            first_name="Notification",
            last_name="Manager",
        )

        self.employee = User.objects.create_user(
            username="notification_employee",
            email="notification.employee@example.com",
            password="TestPass123!",
            first_name="Notification",
            last_name="Employee",
        )

        self.other_employee = User.objects.create_user(
            username="notification_other",
            email="notification.other@example.com",
            password="TestPass123!",
            first_name="Other",
            last_name="Employee",
        )

        UserRole.objects.create(
            user=self.manager,
            role=self.manager_role,
            scope_type=UserRole.ScopeType.ORGANIZATION,
        )

        UserRole.objects.create(
            user=self.employee,
            role=self.telecaller_role,
            scope_type=UserRole.ScopeType.OWN,
        )

        UserRole.objects.create(
            user=self.other_employee,
            role=self.telecaller_role,
            scope_type=UserRole.ScopeType.OWN,
        )

    def authenticate(self, user):
        self.client.force_authenticate(user=user)

    def create_task(self, **kwargs):
        defaults = {
            "title": "Follow up with student",
            "assigned_to": self.employee,
            "assigned_by": self.manager,
            "priority": Task.Priority.NORMAL,
            "status": Task.Status.PENDING,
            "source_module": Task.SourceModule.GENERAL,
        }

        defaults.update(kwargs)

        return Task.objects.create(**defaults)

    def test_anonymous_user_cannot_list_notifications(self):
        response = self.client.get(
            reverse("notification-list")
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_manager_can_create_task(self):
        self.authenticate(self.manager)

        response = self.client.post(
            reverse("task-list"),
            {
                "title": "Call admission applicant",
                "description": "Follow up today.",
                "assigned_to": str(self.employee.id),
                "priority": Task.Priority.HIGH,
                "source_module": Task.SourceModule.ADMISSIONS,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        task = Task.objects.get(
            id=response.data["id"]
        )

        self.assertEqual(
            task.assigned_by,
            self.manager,
        )

        self.assertEqual(
            task.assigned_to,
            self.employee,
        )

    def test_task_creation_notifies_assignee(self):
        self.authenticate(self.manager)

        response = self.client.post(
            reverse("task-list"),
            {
                "title": "Contact pending lead",
                "assigned_to": str(self.employee.id),
                "priority": Task.Priority.HIGH,
                "source_module": Task.SourceModule.LEADS,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        task = Task.objects.get(
            id=response.data["id"]
        )

        notification = Notification.objects.get(
            recipient=self.employee,
            task=task,
        )

        self.assertEqual(
            notification.notification_type,
            Notification.Type.TASK,
        )

        self.assertFalse(notification.is_read)

    def test_regular_employee_cannot_create_task(self):
        self.authenticate(self.employee)

        response = self.client.post(
            reverse("task-list"),
            {
                "title": "Unauthorized assignment",
                "assigned_to": str(
                    self.other_employee.id
                ),
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_employee_can_see_own_task(self):
        task = self.create_task()

        self.authenticate(self.employee)

        response = self.client.get(
            reverse("my-task-list")
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        ids = {
            item["id"]
            for item in response.data
        }

        self.assertIn(
            str(task.id),
            ids,
        )

    def test_employee_cannot_see_another_users_task(self):
        self.create_task(
            assigned_to=self.other_employee,
        )

        self.authenticate(self.employee)

        response = self.client.get(
            reverse("my-task-list")
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            len(response.data),
            0,
        )

    def test_employee_can_complete_own_task(self):
        task = self.create_task()

        self.authenticate(self.employee)

        response = self.client.patch(
            reverse(
                "my-task-status",
                kwargs={"pk": task.id},
            ),
            {
                "status": Task.Status.COMPLETED,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        task.refresh_from_db()

        self.assertEqual(
            task.status,
            Task.Status.COMPLETED,
        )

        self.assertIsNotNone(
            task.completed_at
        )

    def test_employee_cannot_update_another_users_task(self):
        task = self.create_task(
            assigned_to=self.other_employee,
        )

        self.authenticate(self.employee)

        response = self.client.patch(
            reverse(
                "my-task-status",
                kwargs={"pk": task.id},
            ),
            {
                "status": Task.Status.COMPLETED,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_task_completion_notifies_assigner(self):
        task = self.create_task()

        self.authenticate(self.employee)

        response = self.client.patch(
            reverse(
                "my-task-status",
                kwargs={"pk": task.id},
            ),
            {
                "status": Task.Status.COMPLETED,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertTrue(
            Notification.objects.filter(
                recipient=self.manager,
                task=task,
                notification_type=(
                    Notification.Type.SUCCESS
                ),
            ).exists()
        )

    def test_manager_can_reassign_task(self):
        task = self.create_task()

        self.authenticate(self.manager)

        response = self.client.patch(
            reverse(
                "task-detail",
                kwargs={"pk": task.id},
            ),
            {
                "assigned_to": str(
                    self.other_employee.id
                ),
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        task.refresh_from_db()

        self.assertEqual(
            task.assigned_to,
            self.other_employee,
        )

        self.assertTrue(
            Notification.objects.filter(
                recipient=self.other_employee,
                task=task,
                notification_type=(
                    Notification.Type.TASK
                ),
            ).exists()
        )

    def test_inactive_user_cannot_receive_new_task(self):
        self.other_employee.is_active = False
        self.other_employee.save(
            update_fields=["is_active"]
        )

        self.authenticate(self.manager)

        response = self.client.post(
            reverse("task-list"),
            {
                "title": "Invalid assignment",
                "assigned_to": str(
                    self.other_employee.id
                ),
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_reminder_cannot_be_after_due_date(self):
        self.authenticate(self.manager)

        due_at = timezone.now() + timedelta(days=1)
        reminder_at = due_at + timedelta(hours=1)

        response = self.client.post(
            reverse("task-list"),
            {
                "title": "Invalid reminder",
                "assigned_to": str(self.employee.id),
                "due_at": due_at.isoformat(),
                "reminder_at": reminder_at.isoformat(),
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_user_only_sees_own_notifications(self):
        own_notification = Notification.objects.create(
            recipient=self.employee,
            title="My notification",
        )

        Notification.objects.create(
            recipient=self.other_employee,
            title="Other notification",
        )

        self.authenticate(self.employee)

        response = self.client.get(
            reverse("notification-list")
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        ids = {
            item["id"]
            for item in response.data
        }

        self.assertIn(
            str(own_notification.id),
            ids,
        )

        self.assertEqual(
            len(ids),
            1,
        )

    def test_unread_count_is_user_specific(self):
        Notification.objects.create(
            recipient=self.employee,
            title="Unread 1",
        )

        Notification.objects.create(
            recipient=self.employee,
            title="Unread 2",
        )

        Notification.objects.create(
            recipient=self.other_employee,
            title="Other unread",
        )

        self.authenticate(self.employee)

        response = self.client.get(
            reverse("notification-unread-count")
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            response.data["unread_count"],
            2,
        )

    def test_user_can_mark_own_notification_read(self):
        notification = Notification.objects.create(
            recipient=self.employee,
            title="Read me",
        )

        self.authenticate(self.employee)

        response = self.client.post(
            reverse(
                "notification-mark-read",
                kwargs={"pk": notification.id},
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        notification.refresh_from_db()

        self.assertTrue(notification.is_read)
        self.assertIsNotNone(notification.read_at)

    def test_user_cannot_mark_another_notification_read(self):
        notification = Notification.objects.create(
            recipient=self.other_employee,
            title="Private notification",
        )

        self.authenticate(self.employee)

        response = self.client.post(
            reverse(
                "notification-mark-read",
                kwargs={"pk": notification.id},
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

        notification.refresh_from_db()

        self.assertFalse(notification.is_read)

    def test_mark_all_read_only_updates_current_user(self):
        own_one = Notification.objects.create(
            recipient=self.employee,
            title="Own one",
        )

        own_two = Notification.objects.create(
            recipient=self.employee,
            title="Own two",
        )

        other = Notification.objects.create(
            recipient=self.other_employee,
            title="Other",
        )

        self.authenticate(self.employee)

        response = self.client.post(
            reverse("notification-mark-all-read")
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            response.data["updated"],
            2,
        )

        own_one.refresh_from_db()
        own_two.refresh_from_db()
        other.refresh_from_db()

        self.assertTrue(own_one.is_read)
        self.assertTrue(own_two.is_read)
        self.assertFalse(other.is_read)

    def test_overdue_filter(self):
        overdue_task = self.create_task(
            title="Overdue",
            due_at=timezone.now() - timedelta(days=1),
        )

        self.create_task(
            title="Future",
            due_at=timezone.now() + timedelta(days=1),
        )

        self.authenticate(self.manager)

        response = self.client.get(
            reverse("task-list"),
            {
                "overdue": "true",
            },
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        ids = {
            item["id"]
            for item in response.data
        }

        self.assertIn(
            str(overdue_task.id),
            ids,
        )

        self.assertEqual(
            len(ids),
            1,
        )