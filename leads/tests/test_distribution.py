from django.contrib.auth import get_user_model
from django.utils import timezone

from rest_framework.test import APITestCase

from accounts.models import Role, UserRole
from hr.models import Employee
from organization.models import (
    Trust,
    Branch,
    BusinessUnit,
    Department,
)

from leads.models import (
    Lead,
    LeadActivity,
)


User = get_user_model()


class LeadDistributionAPITests(APITestCase):

    @classmethod
    def setUpTestData(cls):

        # ========================================================
        # ORGANIZATION
        # ========================================================

        cls.trust = Trust.objects.create(
            name="Brainstorm Educational Service Trust",
        )

        cls.business_unit = BusinessUnit.objects.create(
            trust=cls.trust,
            name="BEST Education",
            code="BEST",
        )

        cls.branch = Branch.objects.create(
            business_unit=cls.business_unit,
            name="Main Branch",
            code="MAIN",
        )

        cls.marketing_department = (
            Department.objects.create(
                branch=cls.branch,
                name="Marketing",
                code="MKT",
            )
        )

        # ========================================================
        # ROLES
        # ========================================================

        cls.manager_role, _ = Role.objects.get_or_create(
            code="DEPARTMENT_HEAD",
            defaults={
                "name": "Department Head",
            },
        )

        cls.telecaller_role, _ = Role.objects.get_or_create(
            code="TELECALLER",
            defaults={
                "name": "Telecaller",
            },
        )

        # ========================================================
        # USERS
        # ========================================================

        cls.manager = User.objects.create_user(
            username="distribution_manager",
            email="distribution.manager@example.com",
            password="TestPass123!",
        )

        cls.telecaller_one = User.objects.create_user(
            username="telecaller_one",
            email="telecaller1@example.com",
            password="TestPass123!",
        )

        cls.telecaller_two = User.objects.create_user(
            username="telecaller_two",
            email="telecaller2@example.com",
            password="TestPass123!",
        )

        # ========================================================
        # EMPLOYEES
        # ========================================================

        cls.manager_employee = Employee.objects.create(
            user=cls.manager,
            employee_id="EMP-DM-001",
            branch=cls.branch,
            department=cls.marketing_department,
            employment_status=(
                Employee.EmploymentStatus.ACTIVE
            ),
        )

        cls.telecaller_one_employee = (
            Employee.objects.create(
                user=cls.telecaller_one,
                employee_id="EMP-TC-001",
                branch=cls.branch,
                department=cls.marketing_department,
                employment_status=(
                    Employee.EmploymentStatus.ACTIVE
                ),
            )
        )

        cls.telecaller_two_employee = (
            Employee.objects.create(
                user=cls.telecaller_two,
                employee_id="EMP-TC-002",
                branch=cls.branch,
                department=cls.marketing_department,
                employment_status=(
                    Employee.EmploymentStatus.ACTIVE
                ),
            )
        )

        # ========================================================
        # ROLE ASSIGNMENTS
        # ========================================================

        UserRole.objects.create(
            user=cls.manager,
            role=cls.manager_role,
            scope_type=UserRole.ScopeType.DEPARTMENT,
            department=cls.marketing_department,
            is_active=True,
        )

        UserRole.objects.create(
            user=cls.telecaller_one,
            role=cls.telecaller_role,
            scope_type=UserRole.ScopeType.OWN,
            is_active=True,
        )

        UserRole.objects.create(
            user=cls.telecaller_two,
            role=cls.telecaller_role,
            scope_type=UserRole.ScopeType.OWN,
            is_active=True,
        )


        # ========================================================
        # SECURITY TEST FIXTURES
        # ========================================================

        cls.other_branch = Branch.objects.create(
            business_unit=cls.business_unit,
            name="Other Branch",
            code="OTHER",
        )

        cls.other_department = Department.objects.create(
            branch=cls.other_branch,
            name="Other Marketing",
            code="OMKT",
        )

        cls.outside_telecaller = User.objects.create_user(
            username="outside_telecaller",
            email="outside.telecaller@example.com",
            password="TestPass123!",
        )

        cls.outside_employee = Employee.objects.create(
            user=cls.outside_telecaller,
            employee_id="EMP-OUT-001",
            branch=cls.other_branch,
            department=cls.other_department,
            employment_status=(
                Employee.EmploymentStatus.ACTIVE
            ),
        )

        UserRole.objects.create(
            user=cls.outside_telecaller,
            role=cls.telecaller_role,
            scope_type=UserRole.ScopeType.OWN,
            is_active=True,
        )

        cls.inactive_telecaller = User.objects.create_user(
            username="inactive_telecaller",
            email="inactive.telecaller@example.com",
            password="TestPass123!",
        )

        cls.inactive_employee = Employee.objects.create(
            user=cls.inactive_telecaller,
            employee_id="EMP-INACTIVE-001",
            branch=cls.branch,
            department=cls.marketing_department,
            employment_status=(
                Employee.EmploymentStatus.INACTIVE
            ),
        )

        UserRole.objects.create(
            user=cls.inactive_telecaller,
            role=cls.telecaller_role,
            scope_type=UserRole.ScopeType.OWN,
            is_active=True,
        )
    # ============================================================
    # HELPERS
    # ============================================================

    def authenticate(self, user):
        self.client.force_authenticate(
            user=user
        )

    def create_lead(
        self,
        number,
        assigned_to=None,
        status=None,
    ):
        if status is None:
            status = (
                Lead.Status.ASSIGNED
                if assigned_to
                else Lead.Status.NEW
            )

        return Lead.objects.create(
            name=f"Distribution Lead {number}",
            phone_number=f"910000{number:04d}",
            vertical=Lead.Vertical.REGULAR,
            channel=Lead.Channel.DIRECT,
            source="Distribution Test",
            status=status,
            assigned_to=assigned_to,
            assigned_at=(
                timezone.now()
                if assigned_to
                else None
            ),
            created_by=self.manager,
        )

    # ============================================================
    # BULK ASSIGNMENT
    # ============================================================

    def test_manager_can_bulk_assign_leads(self):
        self.authenticate(
            self.manager
        )

        lead_one = self.create_lead(1)
        lead_two = self.create_lead(2)
        lead_three = self.create_lead(3)

        response = self.client.post(
            "/api/leads/bulk-assign/",
            {
                "lead_ids": [
                    str(lead_one.id),
                    str(lead_two.id),
                    str(lead_three.id),
                ],
                "user_id": str(
                    self.telecaller_one.id
                ),
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        self.assertEqual(
            response.data[
                "assigned_count"
            ],
            3,
        )

        for lead in [
            lead_one,
            lead_two,
            lead_three,
        ]:
            lead.refresh_from_db()

            self.assertEqual(
                lead.assigned_to,
                self.telecaller_one,
            )

            self.assertEqual(
                lead.status,
                Lead.Status.ASSIGNED,
            )

            self.assertIsNotNone(
                lead.assigned_at
            )

    # ============================================================
    # ASSIGNMENT ACTIVITY
    # ============================================================

    def test_bulk_assignment_creates_activity(self):
        self.authenticate(
            self.manager
        )

        lead = self.create_lead(10)

        response = self.client.post(
            "/api/leads/bulk-assign/",
            {
                "lead_ids": [
                    str(lead.id)
                ],
                "user_id": str(
                    self.telecaller_one.id
                ),
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        self.assertTrue(
            LeadActivity.objects.filter(
                lead=lead,
                activity_type=(
                    LeadActivity
                    .ActivityType
                    .ASSIGNED
                ),
                performed_by=self.manager,
            ).exists()
        )

    # ============================================================
    # ROUND-ROBIN DISTRIBUTION
    # ============================================================

    def test_equal_distribution_between_two_users(self):
        self.authenticate(
            self.manager
        )

        leads = [
            self.create_lead(number)
            for number in range(
                20,
                25,
            )
        ]

        response = self.client.post(
            "/api/leads/distribute/",
            {
                "lead_ids": [
                    str(lead.id)
                    for lead in leads
                ],
                "user_ids": [
                    str(
                        self.telecaller_one.id
                    ),
                    str(
                        self.telecaller_two.id
                    ),
                ],
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        self.assertEqual(
            response.data[
                "distributed_count"
            ],
            5,
        )

        self.assertEqual(
            response.data[
                "employee_count"
            ],
            2,
        )

        one_count = Lead.objects.filter(
            id__in=[
                lead.id
                for lead in leads
            ],
            assigned_to=self.telecaller_one,
        ).count()

        two_count = Lead.objects.filter(
            id__in=[
                lead.id
                for lead in leads
            ],
            assigned_to=self.telecaller_two,
        ).count()

        self.assertEqual(
            sorted(
                [
                    one_count,
                    two_count,
                ]
            ),
            [2, 3],
        )

    # ============================================================
    # WORKLOAD
    # ============================================================

    def test_workload_returns_active_lead_counts(self):
        self.create_lead(
            30,
            assigned_to=self.telecaller_one,
        )

        self.create_lead(
            31,
            assigned_to=self.telecaller_one,
        )

        self.create_lead(
            32,
            assigned_to=self.telecaller_two,
        )

        self.authenticate(
            self.manager
        )

        response = self.client.get(
            "/api/leads/workload/"
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        employees = response.data[
            "employees"
        ]

        workload_by_user = {
            employee["user_id"]:
            employee["active_leads"]
            for employee in employees
        }

        self.assertEqual(
            workload_by_user[
                str(
                    self.telecaller_one.id
                )
            ],
            2,
        )

        self.assertEqual(
            workload_by_user[
                str(
                    self.telecaller_two.id
                )
            ],
            1,
        )

    # ============================================================
    # TELECALLER SECURITY
    # ============================================================

    def test_telecaller_cannot_bulk_assign(self):
        lead = self.create_lead(40)

        self.authenticate(
            self.telecaller_one
        )

        response = self.client.post(
            "/api/leads/bulk-assign/",
            {
                "lead_ids": [
                    str(lead.id)
                ],
                "user_id": str(
                    self.telecaller_two.id
                ),
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            403,
        )

    def test_telecaller_cannot_distribute(self):
        lead = self.create_lead(41)

        self.authenticate(
            self.telecaller_one
        )

        response = self.client.post(
            "/api/leads/distribute/",
            {
                "lead_ids": [
                    str(lead.id)
                ],
                "user_ids": [
                    str(
                        self.telecaller_two.id
                    )
                ],
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            403,
        )

    def test_telecaller_cannot_view_workload(self):
        self.authenticate(
            self.telecaller_one
        )

        response = self.client.get(
            "/api/leads/workload/"
        )

        self.assertEqual(
            response.status_code,
            403,
        )

    # ============================================================
    # VALIDATION
    # ============================================================

    def test_duplicate_lead_ids_are_rejected(self):
        lead = self.create_lead(50)

        self.authenticate(
            self.manager
        )

        response = self.client.post(
            "/api/leads/bulk-assign/",
            {
                "lead_ids": [
                    str(lead.id),
                    str(lead.id),
                ],
                "user_id": str(
                    self.telecaller_one.id
                ),
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            400,
        )

    def test_duplicate_user_ids_are_rejected(self):
        lead = self.create_lead(51)

        self.authenticate(
            self.manager
        )

        response = self.client.post(
            "/api/leads/distribute/",
            {
                "lead_ids": [
                    str(lead.id)
                ],
                "user_ids": [
                    str(
                        self.telecaller_one.id
                    ),
                    str(
                        self.telecaller_one.id
                    ),
                ],
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            400,
        )

    # ============================================================
    # FINAL SECURITY TESTS
    # ============================================================

    def test_manager_cannot_bulk_assign_to_out_of_scope_employee(
        self
    ):
        lead = self.create_lead(60)

        self.authenticate(self.manager)

        response = self.client.post(
            "/api/leads/bulk-assign/",
            {
                "lead_ids": [
                    str(lead.id)
                ],
                "user_id": str(
                    self.outside_telecaller.id
                ),
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            403,
        )

        lead.refresh_from_db()

        self.assertIsNone(
            lead.assigned_to
        )

        self.assertEqual(
            lead.status,
            Lead.Status.NEW,
        )

    def test_distribution_is_atomic_for_out_of_scope_employee(
        self
    ):
        lead_one = self.create_lead(61)
        lead_two = self.create_lead(62)

        self.authenticate(self.manager)

        response = self.client.post(
            "/api/leads/distribute/",
            {
                "lead_ids": [
                    str(lead_one.id),
                    str(lead_two.id),
                ],
                "user_ids": [
                    str(
                        self.telecaller_one.id
                    ),
                    str(
                        self.outside_telecaller.id
                    ),
                ],
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            403,
        )

        lead_one.refresh_from_db()
        lead_two.refresh_from_db()

        # Neither lead may be assigned.
        self.assertIsNone(
            lead_one.assigned_to
        )

        self.assertIsNone(
            lead_two.assigned_to
        )

        self.assertEqual(
            lead_one.status,
            Lead.Status.NEW,
        )

        self.assertEqual(
            lead_two.status,
            Lead.Status.NEW,
        )

    def test_manager_cannot_reassign_out_of_scope_assigned_lead(
        self
    ):
        lead = self.create_lead(
            63,
            assigned_to=(
                self.outside_telecaller
            ),
        )

        self.authenticate(self.manager)

        response = self.client.post(
            "/api/leads/bulk-assign/",
            {
                "lead_ids": [
                    str(lead.id)
                ],
                "user_id": str(
                    self.telecaller_one.id
                ),
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            403,
        )

        lead.refresh_from_db()

        self.assertEqual(
            lead.assigned_to,
            self.outside_telecaller,
        )

    def test_inactive_employee_cannot_receive_bulk_assignment(
        self
    ):
        lead = self.create_lead(64)

        self.authenticate(self.manager)

        response = self.client.post(
            "/api/leads/bulk-assign/",
            {
                "lead_ids": [
                    str(lead.id)
                ],
                "user_id": str(
                    self.inactive_telecaller.id
                ),
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            400,
        )

        lead.refresh_from_db()

        self.assertIsNone(
            lead.assigned_to
        )

        self.assertEqual(
            lead.status,
            Lead.Status.NEW,
        )

    def test_workload_excludes_out_of_scope_employee(
        self
    ):
        self.create_lead(
            65,
            assigned_to=(
                self.telecaller_one
            ),
        )

        self.create_lead(
            66,
            assigned_to=(
                self.outside_telecaller
            ),
        )

        self.authenticate(self.manager)

        response = self.client.get(
            "/api/leads/workload/"
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        returned_user_ids = {
            employee["user_id"]
            for employee
            in response.data["employees"]
        }

        self.assertIn(
            str(
                self.telecaller_one.id
            ),
            returned_user_ids,
        )

        self.assertNotIn(
            str(
                self.outside_telecaller.id
            ),
            returned_user_ids,
        )

    def test_workload_excludes_terminal_lead_statuses(
        self
    ):
        # Active workload
        self.create_lead(
            67,
            assigned_to=(
                self.telecaller_one
            ),
            status=Lead.Status.ASSIGNED,
        )

        # Terminal/non-active workload
        self.create_lead(
            68,
            assigned_to=(
                self.telecaller_one
            ),
            status=Lead.Status.CONVERTED,
        )

        self.create_lead(
            69,
            assigned_to=(
                self.telecaller_one
            ),
            status=Lead.Status.CLOSED,
        )

        self.create_lead(
            70,
            assigned_to=(
                self.telecaller_one
            ),
            status=(
                Lead.Status.NOT_INTERESTED
            ),
        )

        self.authenticate(self.manager)

        response = self.client.get(
            "/api/leads/workload/"
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        workload_by_user = {
            employee["user_id"]:
            employee["active_leads"]
            for employee
            in response.data["employees"]
        }

        self.assertEqual(
            workload_by_user[
                str(
                    self.telecaller_one.id
                )
            ],
            1,
        )