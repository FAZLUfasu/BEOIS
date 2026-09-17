from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone

from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import AccessToken

from accounts.models import Role, UserRole
from hr.models import Employee
from leads.models import CallLog, Lead, LeadActivity
from organization.models import (
    Branch,
    BusinessUnit,
    Department,
    Trust,
)


User = get_user_model()


class LeadsAPISecurityTests(APITestCase):

    @classmethod
    def setUpTestData(cls):
        # ========================================================
        # ORGANIZATION
        # ========================================================

        cls.trust = Trust.objects.create(
            name="BEOIS Leads API Test Trust",
        )

        cls.business_unit = BusinessUnit.objects.create(
            trust=cls.trust,
            name="BEST Test Unit",
        )

        cls.branch = Branch.objects.create(
            business_unit=cls.business_unit,
            name="Head Office Test",
            code="TEST-HO",
        )

        cls.other_branch = Branch.objects.create(
            business_unit=cls.business_unit,
            name="Other Branch Test",
            code="TEST-OTHER",
        )
                

        cls.marketing_department = Department.objects.create(
            branch=None,
            name="Marketing",
        )

        cls.finance_department = Department.objects.create(
            branch=None,
            name="Accounts/Finance",
        )

        # ========================================================
        # ROLES
        # ========================================================

        cls.department_head_role = Role.objects.create(
            name="Department Head Test",
            code="DEPARTMENT_HEAD",
        )

        cls.telecaller_role = Role.objects.create(
            name="Telecaller Test",
            code="TELECALLER",
        )

        # ========================================================
        # MARKETING HOD
        # ========================================================

        cls.marketing_hod = User.objects.create_user(
            username="marketing_hod_test",
            email="marketinghod@test.local",
            password="TestPassword123!",
        )

        cls.marketing_hod_employee = Employee.objects.create(
            user=cls.marketing_hod,
            branch=cls.branch,
            department=cls.marketing_department,
            employment_status="ACTIVE",
        )

        UserRole.objects.create(
            user=cls.marketing_hod,
            role=cls.department_head_role,
            scope_type=UserRole.ScopeType.DEPARTMENT,
            department=cls.marketing_department,
        )

        # ========================================================
        # MARKETING TELECALLER
        # ========================================================

        cls.telecaller = User.objects.create_user(
            username="telecaller_test",
            email="telecaller@test.local",
            password="TestPassword123!",
        )

        cls.telecaller_employee = Employee.objects.create(
            user=cls.telecaller,
            branch=cls.branch,
            department=cls.marketing_department,
            employment_status="ACTIVE",
        )

        UserRole.objects.create(
            user=cls.telecaller,
            role=cls.telecaller_role,
            scope_type=UserRole.ScopeType.OWN,
        )

        # ========================================================
        # SECOND MARKETING TELECALLER
        # ========================================================

        cls.other_telecaller = User.objects.create_user(
            username="other_telecaller_test",
            email="othertelecaller@test.local",
            password="TestPassword123!",
        )

        cls.other_telecaller_employee = Employee.objects.create(
            user=cls.other_telecaller,
            branch=cls.branch,
            department=cls.marketing_department,
            employment_status="ACTIVE",
        )

        UserRole.objects.create(
            user=cls.other_telecaller,
            role=cls.telecaller_role,
            scope_type=UserRole.ScopeType.OWN,
        )

        # ========================================================
        # OUT-OF-SCOPE USER
        # ========================================================

        cls.finance_user = User.objects.create_user(
            username="finance_user_test",
            email="finance@test.local",
            password="TestPassword123!",
        )

        cls.finance_employee = Employee.objects.create(
            user=cls.finance_user,
            branch=cls.other_branch,
            department=cls.finance_department,
            employment_status="ACTIVE",
        )

        # ========================================================
        # SUPERUSER
        # ========================================================

        cls.superuser = User.objects.create_superuser(
            username="leads_superuser_test",
            email="superuser@test.local",
            password="TestPassword123!",
        )

        # ========================================================
        # TEST LEADS
        # ========================================================

        cls.telecaller_lead = Lead.objects.create(
            name="Telecaller Test Lead",
            phone_number="9000000001",
            vertical=Lead.Vertical.REGULAR,
            channel=Lead.Channel.DIRECT,
            source="API Test",
            assigned_to=cls.telecaller,
            assigned_at=timezone.now(),
            status=Lead.Status.ASSIGNED,
            created_by=cls.marketing_hod,
        )

        LeadActivity.objects.create(
            lead=cls.telecaller_lead,
            activity_type=LeadActivity.ActivityType.CREATED,
            description="Test lead created.",
            performed_by=cls.marketing_hod,
        )

        cls.other_telecaller_lead = Lead.objects.create(
            name="Other Telecaller Lead",
            phone_number="9000000002",
            vertical=Lead.Vertical.REGULAR,
            channel=Lead.Channel.DIRECT,
            source="API Test",
            assigned_to=cls.other_telecaller,
            assigned_at=timezone.now(),
            status=Lead.Status.ASSIGNED,
            created_by=cls.marketing_hod,
        )

        cls.out_of_scope_lead = Lead.objects.create(
            name="Finance Scope Lead",
            phone_number="9000000003",
            vertical=Lead.Vertical.REGULAR,
            channel=Lead.Channel.DIRECT,
            source="API Test",
            assigned_to=cls.finance_user,
            assigned_at=timezone.now(),
            status=Lead.Status.ASSIGNED,
            created_by=cls.superuser,
        )

    # ============================================================
    # HELPER
    # ============================================================

    def authenticate(self, user):
        self.client.force_authenticate(
            user=user,
        )

    # ============================================================
    # AUTHENTICATION TESTS
    # ============================================================

    def test_anonymous_user_cannot_access_leads(self):
        response = self.client.get(
            "/api/leads/"
        )

        self.assertIn(
            response.status_code,
            [401, 403],
        )

    def test_jwt_authentication_works(self):
        token = AccessToken.for_user(
            self.telecaller
        )

        self.client.credentials(
            HTTP_AUTHORIZATION=(
                f"Bearer {str(token)}"
            )
        )

        response = self.client.get(
            "/api/leads/"
        )

        self.assertEqual(
            response.status_code,
            200,
        )

    def test_invalid_jwt_is_rejected(self):
        self.client.credentials(
            HTTP_AUTHORIZATION=(
                "Bearer invalid-token"
            )
        )

        response = self.client.get(
            "/api/leads/"
        )

        self.assertEqual(
            response.status_code,
            401,
        )

    # ============================================================
    # LEAD SCOPE TESTS
    # ============================================================

    def test_telecaller_sees_only_own_lead(self):
        self.authenticate(
            self.telecaller
        )

        response = self.client.get(
            "/api/leads/"
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        ids = {
            item["lead_id"]
            for item in response.json()
        }

        self.assertIn(
            self.telecaller_lead.lead_id,
            ids,
        )

        self.assertNotIn(
            self.other_telecaller_lead.lead_id,
            ids,
        )

        self.assertNotIn(
            self.out_of_scope_lead.lead_id,
            ids,
        )

    def test_telecaller_cannot_retrieve_other_users_lead(self):
        self.authenticate(
            self.telecaller
        )

        response = self.client.get(
            (
                "/api/leads/"
                f"{self.other_telecaller_lead.id}/"
            )
        )

        self.assertEqual(
            response.status_code,
            404,
        )

    def test_department_head_sees_department_leads(self):
        self.authenticate(
            self.marketing_hod
        )

        response = self.client.get(
            "/api/leads/"
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        ids = {
            item["lead_id"]
            for item in response.json()
        }

        self.assertIn(
            self.telecaller_lead.lead_id,
            ids,
        )

        self.assertIn(
            self.other_telecaller_lead.lead_id,
            ids,
        )

        self.assertNotIn(
            self.out_of_scope_lead.lead_id,
            ids,
        )

    def test_superuser_sees_all_leads(self):
        self.authenticate(
            self.superuser
        )

        response = self.client.get(
            "/api/leads/"
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        ids = {
            item["lead_id"]
            for item in response.json()
        }

        self.assertIn(
            self.telecaller_lead.lead_id,
            ids,
        )

        self.assertIn(
            self.other_telecaller_lead.lead_id,
            ids,
        )

        self.assertIn(
            self.out_of_scope_lead.lead_id,
            ids,
        )

    # ============================================================
    # CREATE LEAD
    # ============================================================

    def test_department_head_can_create_direct_lead(self):
        self.authenticate(
            self.marketing_hod
        )

        response = self.client.post(
            "/api/leads/",
            {
                "name": "New API Lead",
                "phone_number": "9000000010",
                "vertical": "REGULAR",
                "channel": "DIRECT",
                "source": "Website",
                "interested_course": "B.Com",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            201,
        )

        lead = Lead.objects.get(
            phone_number="9000000010"
        )

        self.assertEqual(
            lead.created_by,
            self.marketing_hod,
        )

        self.assertTrue(
            lead.activities.filter(
                activity_type=(
                    LeadActivity.ActivityType.CREATED
                )
            ).exists()
        )

    # ============================================================
    # ASSIGNMENT SECURITY
    # ============================================================

    def test_department_head_can_assign_lead_within_scope(self):
        self.authenticate(
            self.marketing_hod
        )

        response = self.client.post(
            (
                "/api/leads/"
                f"{self.telecaller_lead.id}/"
                "assign/"
            ),
            {
                "user_id": str(
                    self.other_telecaller.id
                )
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        self.telecaller_lead.refresh_from_db()

        self.assertEqual(
            self.telecaller_lead.assigned_to,
            self.other_telecaller,
        )

    def test_department_head_cannot_assign_outside_scope(self):
        self.authenticate(
            self.marketing_hod
        )

        response = self.client.post(
            (
                "/api/leads/"
                f"{self.telecaller_lead.id}/"
                "assign/"
            ),
            {
                "user_id": str(
                    self.finance_user.id
                )
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            403,
        )

        self.telecaller_lead.refresh_from_db()

        self.assertEqual(
            self.telecaller_lead.assigned_to,
            self.telecaller,
        )

    def test_telecaller_cannot_assign_leads(self):
        self.authenticate(
            self.telecaller
        )

        response = self.client.post(
            (
                "/api/leads/"
                f"{self.telecaller_lead.id}/"
                "assign/"
            ),
            {
                "user_id": str(
                    self.other_telecaller.id
                )
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            403,
        )

    # ============================================================
    # CALLING
    # ============================================================

    def test_telecaller_can_record_call_on_own_lead(self):
        self.authenticate(
            self.telecaller
        )

        response = self.client.post(
            (
                "/api/leads/"
                f"{self.telecaller_lead.id}/"
                "call/"
            ),
            {
                "outcome": "INTERESTED",
                "notes": "Student is interested.",
                "duration_seconds": 120,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            201,
        )

        self.telecaller_lead.refresh_from_db()

        self.assertEqual(
            self.telecaller_lead.status,
            Lead.Status.QUALIFIED,
        )

        self.assertTrue(
            CallLog.objects.filter(
                lead=self.telecaller_lead,
                telecaller=self.telecaller,
                outcome=(
                    CallLog.Outcome.INTERESTED
                ),
            ).exists()
        )

    def test_callback_requires_follow_up_datetime(self):
        self.authenticate(
            self.telecaller
        )

        response = self.client.post(
            (
                "/api/leads/"
                f"{self.telecaller_lead.id}/"
                "call/"
            ),
            {
                "outcome": "CALLBACK",
                "notes": "Call tomorrow.",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            400,
        )

    def test_callback_creates_follow_up(self):
        self.authenticate(
            self.telecaller
        )

        follow_up = (
            timezone.now()
            + timedelta(days=1)
        )

        response = self.client.post(
            (
                "/api/leads/"
                f"{self.telecaller_lead.id}/"
                "call/"
            ),
            {
                "outcome": "CALLBACK",
                "notes": "Call tomorrow.",
                "follow_up_at": (
                    follow_up.isoformat()
                ),
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            201,
        )

        self.telecaller_lead.refresh_from_db()

        self.assertEqual(
            self.telecaller_lead.status,
            Lead.Status.FOLLOW_UP,
        )

        self.assertIsNotNone(
            self.telecaller_lead.next_follow_up_at
        )

    # ============================================================
    # STATUS
    # ============================================================

    def test_status_change_creates_activity(self):
        self.authenticate(
            self.telecaller
        )

        response = self.client.post(
            (
                "/api/leads/"
                f"{self.telecaller_lead.id}/"
                "status/"
            ),
            {
                "status": "QUALIFIED",
                "notes": "Qualified manually.",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        self.telecaller_lead.refresh_from_db()

        self.assertEqual(
            self.telecaller_lead.status,
            Lead.Status.QUALIFIED,
        )

        self.assertTrue(
            self.telecaller_lead.activities.filter(
                activity_type=(
                    LeadActivity
                    .ActivityType
                    .STATUS_CHANGE
                )
            ).exists()
        )

    # ============================================================
    # NOTES
    # ============================================================

    def test_note_creates_timeline_activity(self):
        self.authenticate(
            self.telecaller
        )

        response = self.client.post(
            (
                "/api/leads/"
                f"{self.telecaller_lead.id}/"
                "note/"
            ),
            {
                "description": (
                    "Student requested course details."
                )
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            201,
        )

        self.assertTrue(
            self.telecaller_lead.activities.filter(
                activity_type=(
                    LeadActivity.ActivityType.NOTE
                ),
                description=(
                    "Student requested course details."
                ),
            ).exists()
        )

    def test_empty_note_is_rejected(self):
        self.authenticate(
            self.telecaller
        )

        response = self.client.post(
            (
                "/api/leads/"
                f"{self.telecaller_lead.id}/"
                "note/"
            ),
            {
                "description": "   "
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            400,
        )

    # ============================================================
    # ACTIVITY TIMELINE
    # ============================================================

    def test_activity_timeline_is_available(self):
        self.authenticate(
            self.telecaller
        )

        response = self.client.get(
            (
                "/api/leads/"
                f"{self.telecaller_lead.id}/"
                "activities/"
            )
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        self.assertGreaterEqual(
            len(response.json()),
            1,
        )

    # ============================================================
    # FOLLOW-UP QUEUE
    # ============================================================

    def test_follow_up_queue_returns_scheduled_lead(self):
        self.telecaller_lead.status = (
            Lead.Status.FOLLOW_UP
        )

        self.telecaller_lead.next_follow_up_at = (
            timezone.now()
            + timedelta(days=1)
        )

        self.telecaller_lead.save()

        self.authenticate(
            self.telecaller
        )

        response = self.client.get(
            "/api/leads/follow-ups/"
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        ids = {
            item["lead_id"]
            for item in response.json()
        }

        self.assertIn(
            self.telecaller_lead.lead_id,
            ids,
        )

    # ============================================================
    # OVERDUE FOLLOW-UP
    # ============================================================

    def test_overdue_queue_returns_due_lead(self):
        self.telecaller_lead.status = (
            Lead.Status.FOLLOW_UP
        )

        self.telecaller_lead.next_follow_up_at = (
            timezone.now()
            - timedelta(hours=1)
        )

        self.telecaller_lead.save()

        self.authenticate(
            self.telecaller
        )

        response = self.client.get(
            "/api/leads/overdue/"
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        ids = {
            item["lead_id"]
            for item in response.json()
        }

        self.assertIn(
            self.telecaller_lead.lead_id,
            ids,
        )