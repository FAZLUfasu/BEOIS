from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from rest_framework.test import APIClient

from accounts.models import Role, UserRole
from hr.models import Employee
from organization.models import (
    Branch,
    BusinessUnit,
    Department,
    Trust,
)

from dashboard.intelligence import (
    get_task_intelligence,
)
from notifications.models import Task


class TaskIntelligenceTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        User = get_user_model()

        cls.admin = User.objects.create_superuser(
            username="block5a_admin",
            email="block5a_admin@example.com",
            password="TestOnlyPass123!",
        )

        cls.staff = User.objects.create_user(
            username="block5a_staff",
            email="block5a_staff@example.com",
            password="TestOnlyPass123!",
        )

        cls.ordinary = User.objects.create_user(
            username="block5a_ordinary",
            email="block5a_ordinary@example.com",
            password="TestOnlyPass123!",
        )

    def _create_fixture_tasks(self):
        now = timezone.now()

        Task.objects.create(
            title="Urgent overdue task",
            assigned_to=self.staff,
            assigned_by=self.admin,
            priority=Task.Priority.URGENT,
            status=Task.Status.PENDING,
            due_at=(
                now - timedelta(days=8)
            ),
            source_module=(
                Task.SourceModule.LEADS
            ),
            source_label="Lead Follow-up",
        )

        Task.objects.create(
            title="High upcoming task",
            assigned_to=self.staff,
            assigned_by=self.admin,
            priority=Task.Priority.HIGH,
            status=Task.Status.PENDING,
            due_at=(
                now + timedelta(days=2)
            ),
            source_module=(
                Task.SourceModule.ADMISSIONS
            ),
            source_label="Admission Documents",
        )

        Task.objects.create(
            title="Open task without due date",
            assigned_to=self.staff,
            assigned_by=self.admin,
            priority=Task.Priority.NORMAL,
            status=Task.Status.IN_PROGRESS,
            source_module=(
                Task.SourceModule.FINANCE
            ),
            source_label="Finance Follow-up",
        )

        Task.objects.create(
            title="Completed task",
            assigned_to=self.staff,
            assigned_by=self.admin,
            priority=Task.Priority.NORMAL,
            status=Task.Status.COMPLETED,
            due_at=(
                now - timedelta(days=1)
            ),
            completed_at=now,
            source_module=(
                Task.SourceModule.EDUCATION
            ),
            source_label="Education Process",
        )

        Task.objects.create(
            title="Cancelled task",
            assigned_to=self.staff,
            assigned_by=self.admin,
            priority=Task.Priority.LOW,
            status=Task.Status.CANCELLED,
            source_module=(
                Task.SourceModule.GENERAL
            ),
            source_label="General",
        )

    def test_service_reports_live_and_period_metrics(self):
        self._create_fixture_tasks()

        today = timezone.localdate()

        data = get_task_intelligence(
            self.admin,
            start_date=(
                today - timedelta(days=30)
            ),
            end_date=today,
        )

        self.assertEqual(
            data["summary"]["open_tasks"],
            3,
        )
        self.assertEqual(
            data["summary"]["overdue_tasks"],
            1,
        )
        self.assertEqual(
            data["summary"]["due_next_7_days"],
            1,
        )
        self.assertEqual(
            data["summary"]["high_open"],
            1,
        )
        self.assertEqual(
            data["summary"]["urgent_open"],
            1,
        )
        self.assertEqual(
            data["summary"]["without_due_date"],
            1,
        )

        self.assertEqual(
            data["period_activity"]["created"],
            5,
        )
        self.assertEqual(
            data["period_activity"]["completed"],
            1,
        )
        self.assertEqual(
            data["period_activity"][
                "created_cohort_total"
            ],
            4,
        )
        self.assertEqual(
            data["period_activity"][
                "created_cohort_completed"
            ],
            1,
        )
        self.assertEqual(
            data["period_activity"][
                "created_cohort_completion_rate"
            ],
            25.0,
        )

        self.assertEqual(
            data["aging"]["0_2_days"],
            3,
        )

        self.assertEqual(
            len(data["upcoming_deadlines"]),
            1,
        )
        self.assertEqual(
            len(data["oldest_overdue"]),
            1,
        )

        self.assertEqual(
            data["attention"][
                "urgent_overdue"
            ],
            1,
        )
        self.assertEqual(
            data["attention"][
                "overdue_7_plus_days"
            ],
            1,
        )

        self.assertEqual(
            len(data["staff_workload"]),
            1,
        )

        staff = data["staff_workload"][0]

        self.assertEqual(
            staff["open_tasks"],
            3,
        )
        self.assertEqual(
            staff["overdue_tasks"],
            1,
        )
        self.assertEqual(
            staff[
                "completed_in_period"
            ],
            1,
        )
        self.assertEqual(
            staff[
                "created_cohort_completion_rate"
            ],
            25.0,
        )

    def test_service_normalizes_reversed_dates(self):
        today = timezone.localdate()
        earlier = (
            today - timedelta(days=5)
        )

        data = get_task_intelligence(
            self.admin,
            start_date=today,
            end_date=earlier,
        )

        self.assertEqual(
            data["period"]["start_date"],
            earlier,
        )
        self.assertEqual(
            data["period"]["end_date"],
            today,
        )

    def test_endpoint_is_management_only(self):
        client = APIClient()

        client.force_authenticate(
            user=self.ordinary
        )

        response = client.get(
            reverse(
                "dashboard:intelligence-tasks"
            )
        )

        self.assertEqual(
            response.status_code,
            403,
        )

        client.force_authenticate(
            user=self.admin
        )

        response = client.get(
            reverse(
                "dashboard:intelligence-tasks"
            )
        )

        self.assertEqual(
            response.status_code,
            200,
        )
        self.assertIn(
            "summary",
            response.data,
        )
        self.assertIn(
            "staff_workload",
            response.data,
        )


    def test_department_scoped_management_sees_only_department_tasks(
        self,
    ):
        User = get_user_model()

        trust = Trust.objects.create(
            name="Block 5A Scope Trust",
        )

        business_unit = (
            BusinessUnit.objects.create(
                trust=trust,
                name="Block 5A Scope Unit",
            )
        )

        branch = Branch.objects.create(
            business_unit=business_unit,
            name="Block 5A Scope Branch",
        )

        department_a = (
            Department.objects.create(
                name="Block 5A Department A",
                branch=None,
            )
        )

        department_b = (
            Department.objects.create(
                name="Block 5A Department B",
                branch=None,
            )
        )

        manager = User.objects.create_user(
            username="block5a_scope_manager",
            email=(
                "block5a_scope_manager"
                "@example.com"
            ),
            password="TestOnlyPass123!",
        )

        department_a_staff = (
            User.objects.create_user(
                username="block5a_scope_staff_a",
                email=(
                    "block5a_scope_staff_a"
                    "@example.com"
                ),
                password="TestOnlyPass123!",
            )
        )

        department_b_staff = (
            User.objects.create_user(
                username="block5a_scope_staff_b",
                email=(
                    "block5a_scope_staff_b"
                    "@example.com"
                ),
                password="TestOnlyPass123!",
            )
        )

        Employee.objects.create(
            user=department_a_staff,
            branch=branch,
            department=department_a,
            designation="Department A Staff",
            employment_status="ACTIVE",
        )

        Employee.objects.create(
            user=department_b_staff,
            branch=branch,
            department=department_b,
            designation="Department B Staff",
            employment_status="ACTIVE",
        )

        management_role = Role.objects.create(
            name="Block 5A General Manager",
            code="GENERAL_MANAGER",
            is_active=True,
        )

        UserRole.objects.create(
            user=manager,
            role=management_role,
            scope_type=(
                UserRole.ScopeType.DEPARTMENT
            ),
            department=department_a,
            is_active=True,
        )

        Task.objects.create(
            title="Department A visible task",
            assigned_to=department_a_staff,
            assigned_by=self.admin,
            status=Task.Status.PENDING,
            priority=Task.Priority.HIGH,
            source_module=(
                Task.SourceModule.LEADS
            ),
        )

        Task.objects.create(
            title="Department B hidden task",
            assigned_to=department_b_staff,
            assigned_by=self.admin,
            status=Task.Status.PENDING,
            priority=Task.Priority.URGENT,
            source_module=(
                Task.SourceModule.ADMISSIONS
            ),
        )

        data = get_task_intelligence(
            manager
        )

        self.assertEqual(
            data["summary"]["open_tasks"],
            1,
        )

        self.assertEqual(
            len(data["staff_workload"]),
            1,
        )

        self.assertEqual(
            data["staff_workload"][0]["name"],
            "block5a_scope_staff_a",
        )

        modules = {
            row["module"]
            for row in data[
                "module_workload"
            ]
        }

        self.assertIn(
            Task.SourceModule.LEADS,
            modules,
        )

        self.assertNotIn(
            Task.SourceModule.ADMISSIONS,
            modules,
        )

        client = APIClient()

        client.force_authenticate(
            user=manager
        )

        response = client.get(
            reverse(
                "dashboard:intelligence-tasks"
            )
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        self.assertEqual(
            response.data["summary"][
                "open_tasks"
            ],
            1,
        )

    def test_endpoint_rejects_invalid_date(self):
        client = APIClient()

        client.force_authenticate(
            user=self.admin
        )

        response = client.get(
            reverse(
                "dashboard:intelligence-tasks"
            ),
            {
                "start_date": "not-a-date",
            },
        )

        self.assertEqual(
            response.status_code,
            400,
        )
        self.assertIn(
            "detail",
            response.data,
        )
