from datetime import timedelta
from io import BytesIO

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone

from openpyxl import Workbook

from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import AccessToken

from accounts.models import Role, UserRole
from hr.models import Employee
from leads.models import (
    CallLog,
    Lead,
    LeadActivity,
    LeadImportBatch,
    LeadImportRow,
)
from organization.models import (
    Branch,
    BusinessUnit,
    Department,
    Trust,
)


User = get_user_model()


# ================================================================
# EXISTING LEADS API / SECURITY TESTS
# ================================================================

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


# ================================================================
# MARKETING LEAD IMPORT API TESTS
# ================================================================

class MarketingLeadImportAPITests(APITestCase):

    @classmethod
    def setUpTestData(cls):
        # ========================================================
        # ORGANIZATION
        # ========================================================

        cls.trust = Trust.objects.create(
            name="BEOIS Import Test Trust",
        )

        cls.business_unit = BusinessUnit.objects.create(
            trust=cls.trust,
            name="BEST Import Test Unit",
        )

        cls.branch = Branch.objects.create(
            business_unit=cls.business_unit,
            name="Import Test Head Office",
            code="IMPORT-HO",
        )

        cls.marketing_department = Department.objects.create(
            branch=None,
            name="Marketing Import Test",
        )

        # ========================================================
        # ROLES
        # ========================================================

        cls.department_head_role = Role.objects.create(
            name="Import Department Head",
            code="DEPARTMENT_HEAD",
        )

        cls.telecaller_role = Role.objects.create(
            name="Import Telecaller",
            code="TELECALLER",
        )

        # ========================================================
        # MARKETING HOD
        # ========================================================

        cls.marketing_hod = User.objects.create_user(
            username="import_marketing_hod",
            email="importmarketinghod@test.local",
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
        # TELECALLER
        # ========================================================

        cls.telecaller = User.objects.create_user(
            username="import_telecaller",
            email="importtelecaller@test.local",
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
        # SUPERUSER
        # ========================================================

        cls.superuser = User.objects.create_superuser(
            username="import_superuser",
            email="importsuperuser@test.local",
            password="TestPassword123!",
        )

        # ========================================================
        # EXISTING LEAD FOR DUPLICATE TEST
        # ========================================================

        cls.existing_lead = Lead.objects.create(
            name="Existing Import Lead",
            phone_number="9876500000",
            vertical=Lead.Vertical.REGULAR,
            channel=Lead.Channel.DIRECT,
            source="Existing",
            created_by=cls.marketing_hod,
        )

    # ============================================================
    # HELPERS
    # ============================================================

    def authenticate(self, user):
        self.client.force_authenticate(
            user=user,
        )

    def make_csv(
        self,
        content,
        name="leads.csv",
    ):
        return SimpleUploadedFile(
            name,
            content.encode("utf-8"),
            content_type="text/csv",
        )

    def make_xlsx(
        self,
        rows,
        name="leads.xlsx",
    ):
        stream = BytesIO()

        workbook = Workbook()
        sheet = workbook.active

        for row in rows:
            sheet.append(row)

        workbook.save(stream)
        workbook.close()

        stream.seek(0)

        return SimpleUploadedFile(
            name,
            stream.read(),
            content_type=(
                "application/vnd.openxmlformats-"
                "officedocument.spreadsheetml.sheet"
            ),
        )

    def preview(
        self,
        uploaded_file,
        **extra,
    ):
        payload = {
            "file": uploaded_file,
            "source": "Meta Ads",
            "campaign": "September AI Campaign",
            "default_vertical": "REGULAR",
            "default_channel": "DIRECT",
        }

        payload.update(extra)

        return self.client.post(
            "/api/leads/imports/preview/",
            payload,
            format="multipart",
        )

    # ============================================================
    # PERMISSIONS
    # ============================================================

    def test_anonymous_user_cannot_import(self):
        file = self.make_csv(
            "Name,Phone Number\n"
            "Anonymous Lead,9876511001\n"
        )

        response = self.preview(file)

        self.assertIn(
            response.status_code,
            [401, 403],
        )

        self.assertEqual(
            LeadImportBatch.objects.count(),
            0,
        )

    def test_telecaller_cannot_import_marketing_leads(self):
        self.authenticate(
            self.telecaller
        )

        file = self.make_csv(
            "Name,Phone Number\n"
            "Denied Lead,9876511111\n"
        )

        response = self.preview(file)

        self.assertEqual(
            response.status_code,
            403,
        )

        self.assertEqual(
            LeadImportBatch.objects.count(),
            0,
        )

    def test_marketing_department_head_can_preview_import(self):
        self.authenticate(
            self.marketing_hod
        )

        file = self.make_csv(
            "Name,Phone Number\n"
            "Allowed Lead,9876511112\n"
        )

        response = self.preview(file)

        self.assertEqual(
            response.status_code,
            201,
        )

        data = response.json()

        self.assertEqual(
            data["total_rows"],
            1,
        )

        self.assertEqual(
            data["valid_rows"],
            1,
        )

        self.assertEqual(
            data["status"],
            LeadImportBatch.Status.VALIDATED,
        )

    def test_superuser_can_preview_import(self):
        self.authenticate(
            self.superuser
        )

        file = self.make_csv(
            "Name,Phone Number\n"
            "Superuser Lead,9876511113\n"
        )

        response = self.preview(file)

        self.assertEqual(
            response.status_code,
            201,
        )

    # ============================================================
    # CSV PREVIEW
    # ============================================================

    def test_csv_preview_does_not_create_leads(self):
        self.authenticate(
            self.marketing_hod
        )

        before = Lead.objects.count()

        file = self.make_csv(
            "Name,Phone Number\n"
            "Preview One,9876511201\n"
            "Preview Two,9876511202\n"
        )

        response = self.preview(file)

        self.assertEqual(
            response.status_code,
            201,
        )

        self.assertEqual(
            Lead.objects.count(),
            before,
        )

        self.assertEqual(
            response.json()["valid_rows"],
            2,
        )

    def test_csv_phone_numbers_are_normalized(self):
        self.authenticate(
            self.marketing_hod
        )

        file = self.make_csv(
            "Name,Phone Number\n"
            "Country Code,+91 9876511301\n"
            "Zero Prefix,09876511302\n"
        )

        response = self.preview(file)

        self.assertEqual(
            response.status_code,
            201,
        )

        rows = response.json()["rows"]

        phones = {
            row["phone_number"]
            for row in rows
        }

        self.assertIn(
            "9876511301",
            phones,
        )

        self.assertIn(
            "9876511302",
            phones,
        )

    def test_optional_csv_columns_are_read(self):
        self.authenticate(
            self.marketing_hod
        )

        file = self.make_csv(
            "Name,Phone Number,Email,City,State,Course\n"
            "Optional Student,9876511351,"
            "optional@test.local,Chennai,"
            "Tamil Nadu,B.Com\n"
        )

        response = self.preview(file)

        self.assertEqual(
            response.status_code,
            201,
        )

        row = response.json()["rows"][0]

        self.assertEqual(
            row["name"],
            "Optional Student",
        )

        self.assertEqual(
            row["email"],
            "optional@test.local",
        )

        self.assertEqual(
            row["city"],
            "Chennai",
        )

        self.assertEqual(
            row["state"],
            "Tamil Nadu",
        )

        self.assertEqual(
            row["interested_course"],
            "B.Com",
        )

    # ============================================================
    # XLSX PREVIEW
    # ============================================================

    def test_xlsx_preview_works(self):
        self.authenticate(
            self.marketing_hod
        )

        file = self.make_xlsx([
            [
                "Name",
                "Phone Number",
                "Email",
                "City",
                "Course",
            ],
            [
                "Excel Student",
                "9876511401",
                "excel@test.local",
                "Chennai",
                "B.Com",
            ],
        ])

        response = self.preview(file)

        self.assertEqual(
            response.status_code,
            201,
        )

        data = response.json()

        self.assertEqual(
            data["total_rows"],
            1,
        )

        self.assertEqual(
            data["valid_rows"],
            1,
        )

        self.assertEqual(
            data["rows"][0]["name"],
            "Excel Student",
        )

        self.assertEqual(
            data["rows"][0]["phone_number"],
            "9876511401",
        )

        self.assertEqual(
            data["rows"][0]["city"],
            "Chennai",
        )

        self.assertEqual(
            data["rows"][0]["interested_course"],
            "B.Com",
        )

    # ============================================================
    # INVALID / DUPLICATE VALIDATION
    # ============================================================

    def test_invalid_phone_is_reported(self):
        self.authenticate(
            self.marketing_hod
        )

        file = self.make_csv(
            "Name,Phone Number\n"
            "Invalid Student,12345\n"
        )

        response = self.preview(file)

        self.assertEqual(
            response.status_code,
            201,
        )

        data = response.json()

        self.assertEqual(
            data["invalid_rows"],
            1,
        )

        self.assertEqual(
            data["valid_rows"],
            0,
        )

        self.assertEqual(
            data["rows"][0]["status"],
            LeadImportRow.Status.INVALID,
        )

    def test_missing_name_value_is_invalid(self):
        self.authenticate(
            self.marketing_hod
        )

        file = self.make_csv(
            "Name,Phone Number\n"
            ",9876511451\n"
        )

        response = self.preview(file)

        self.assertEqual(
            response.status_code,
            201,
        )

        data = response.json()

        self.assertEqual(
            data["invalid_rows"],
            1,
        )

        self.assertEqual(
            data["rows"][0]["status"],
            LeadImportRow.Status.INVALID,
        )

    def test_duplicate_inside_file_is_reported(self):
        self.authenticate(
            self.marketing_hod
        )

        file = self.make_csv(
            "Name,Phone Number\n"
            "First Student,9876511501\n"
            "Duplicate Student,9876511501\n"
        )

        response = self.preview(file)

        self.assertEqual(
            response.status_code,
            201,
        )

        data = response.json()

        self.assertEqual(
            data["total_rows"],
            2,
        )

        self.assertEqual(
            data["valid_rows"],
            1,
        )

        self.assertEqual(
            data["duplicate_rows"],
            1,
        )

    def test_existing_database_phone_is_duplicate(self):
        self.authenticate(
            self.marketing_hod
        )

        file = self.make_csv(
            "Name,Phone Number\n"
            "Existing Again,9876500000\n"
        )

        response = self.preview(file)

        self.assertEqual(
            response.status_code,
            201,
        )

        data = response.json()

        self.assertEqual(
            data["duplicate_rows"],
            1,
        )

        self.assertEqual(
            data["valid_rows"],
            0,
        )

        row = data["rows"][0]

        self.assertEqual(
            row["status"],
            LeadImportRow.Status.DUPLICATE,
        )

        self.assertEqual(
            row["existing_lead_id"],
            self.existing_lead.lead_id,
        )

    # ============================================================
    # COLUMN VALIDATION
    # ============================================================

    def test_missing_name_column_is_rejected(self):
        self.authenticate(
            self.marketing_hod
        )

        file = self.make_csv(
            "Phone Number,City\n"
            "9876511601,Chennai\n"
        )

        response = self.preview(file)

        self.assertEqual(
            response.status_code,
            400,
        )

        self.assertIn(
            "Name",
            str(response.json()),
        )

    def test_missing_phone_column_is_rejected(self):
        self.authenticate(
            self.marketing_hod
        )

        file = self.make_csv(
            "Name,City\n"
            "Missing Phone,Chennai\n"
        )

        response = self.preview(file)

        self.assertEqual(
            response.status_code,
            400,
        )

        self.assertIn(
            "Phone Number",
            str(response.json()),
        )

    def test_header_aliases_are_supported(self):
        self.authenticate(
            self.marketing_hod
        )

        file = self.make_csv(
            "Full Name,Mobile Number,Mail,Location,Program\n"
            "Alias Student,9876511651,"
            "alias@test.local,Chennai,BBA\n"
        )

        response = self.preview(file)

        self.assertEqual(
            response.status_code,
            201,
        )

        row = response.json()["rows"][0]

        self.assertEqual(
            row["name"],
            "Alias Student",
        )

        self.assertEqual(
            row["phone_number"],
            "9876511651",
        )

        self.assertEqual(
            row["email"],
            "alias@test.local",
        )

        self.assertEqual(
            row["city"],
            "Chennai",
        )

        self.assertEqual(
            row["interested_course"],
            "BBA",
        )

    # ============================================================
    # FILE VALIDATION
    # ============================================================

    def test_unsupported_file_type_is_rejected(self):
        self.authenticate(
            self.marketing_hod
        )

        file = SimpleUploadedFile(
            "leads.txt",
            (
                b"Name,Phone Number\n"
                b"Test,9876511701"
            ),
            content_type="text/plain",
        )

        response = self.preview(file)

        self.assertEqual(
            response.status_code,
            400,
        )

    def test_empty_csv_is_rejected(self):
        self.authenticate(
            self.marketing_hod
        )

        file = self.make_csv(
            "",
        )

        response = self.preview(file)

        self.assertEqual(
            response.status_code,
            400,
        )

    def test_partner_channel_is_rejected_in_v1(self):
        self.authenticate(
            self.marketing_hod
        )

        file = self.make_csv(
            "Name,Phone Number\n"
            "Partner Student,9876511801\n"
        )

        response = self.preview(
            file,
            default_channel="PARTNER",
        )

        self.assertEqual(
            response.status_code,
            400,
        )

    # ============================================================
    # CONFIRM IMPORT
    # ============================================================

    def test_confirm_creates_normal_lead(self):
        self.authenticate(
            self.marketing_hod
        )

        file = self.make_csv(
            "Name,Phone Number,Email,City,Course\n"
            "Confirmed Student,9876511901,"
            "confirmed@test.local,Chennai,BCA\n"
        )

        preview_response = self.preview(
            file
        )

        self.assertEqual(
            preview_response.status_code,
            201,
        )

        batch_id = (
            preview_response.json()["id"]
        )

        self.assertFalse(
            Lead.objects.filter(
                phone_number="9876511901"
            ).exists()
        )

        response = self.client.post(
            (
                "/api/leads/imports/"
                f"{batch_id}/confirm/"
            ),
            {},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        lead = Lead.objects.get(
            phone_number="9876511901"
        )

        self.assertTrue(
            lead.lead_id.startswith("LD-")
        )

        self.assertEqual(
            lead.name,
            "Confirmed Student",
        )

        self.assertEqual(
            lead.email,
            "confirmed@test.local",
        )

        self.assertEqual(
            lead.city,
            "Chennai",
        )

        self.assertEqual(
            lead.interested_course,
            "BCA",
        )

        self.assertEqual(
            lead.status,
            Lead.Status.NEW,
        )

        self.assertEqual(
            lead.source,
            "Meta Ads",
        )

        self.assertEqual(
            lead.campaign,
            "September AI Campaign",
        )

        self.assertEqual(
            lead.vertical,
            Lead.Vertical.REGULAR,
        )

        self.assertEqual(
            lead.channel,
            Lead.Channel.DIRECT,
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

        data = response.json()

        self.assertEqual(
            data["status"],
            LeadImportBatch.Status.COMPLETED,
        )

        self.assertEqual(
            data["imported_rows"],
            1,
        )

    def test_confirm_imports_only_valid_rows(self):
        self.authenticate(
            self.marketing_hod
        )

        file = self.make_csv(
            "Name,Phone Number\n"
            "Valid Student,9876512001\n"
            "Bad Student,123\n"
            "Duplicate Student,9876512001\n"
        )

        preview_response = self.preview(
            file
        )

        self.assertEqual(
            preview_response.status_code,
            201,
        )

        batch_id = (
            preview_response.json()["id"]
        )

        response = self.client.post(
            (
                "/api/leads/imports/"
                f"{batch_id}/confirm/"
            ),
            {},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        self.assertTrue(
            Lead.objects.filter(
                phone_number="9876512001"
            ).exists()
        )

        data = response.json()

        self.assertEqual(
            data["imported_rows"],
            1,
        )

        self.assertEqual(
            data["invalid_rows"],
            1,
        )

        self.assertEqual(
            data["duplicate_rows"],
            1,
        )

    def test_imported_row_links_to_created_lead(self):
        self.authenticate(
            self.marketing_hod
        )

        file = self.make_csv(
            "Name,Phone Number\n"
            "Linked Student,9876512051\n"
        )

        preview_response = self.preview(
            file
        )

        batch_id = (
            preview_response.json()["id"]
        )

        response = self.client.post(
            (
                "/api/leads/imports/"
                f"{batch_id}/confirm/"
            ),
            {},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        batch = LeadImportBatch.objects.get(
            id=batch_id
        )

        row = batch.rows.get()

        self.assertEqual(
            row.status,
            LeadImportRow.Status.IMPORTED,
        )

        self.assertIsNotNone(
            row.imported_lead
        )

        self.assertEqual(
            row.imported_lead.phone_number,
            "9876512051",
        )

    def test_second_confirmation_is_rejected(self):
        self.authenticate(
            self.marketing_hod
        )

        file = self.make_csv(
            "Name,Phone Number\n"
            "Single Import,9876512101\n"
        )

        preview_response = self.preview(
            file
        )

        self.assertEqual(
            preview_response.status_code,
            201,
        )

        batch_id = (
            preview_response.json()["id"]
        )

        first = self.client.post(
            (
                "/api/leads/imports/"
                f"{batch_id}/confirm/"
            ),
            {},
            format="json",
        )

        self.assertEqual(
            first.status_code,
            200,
        )

        second = self.client.post(
            (
                "/api/leads/imports/"
                f"{batch_id}/confirm/"
            ),
            {},
            format="json",
        )

        self.assertEqual(
            second.status_code,
            400,
        )

        self.assertEqual(
            Lead.objects.filter(
                phone_number="9876512101"
            ).count(),
            1,
        )

    def test_duplicate_created_between_preview_and_confirm_is_skipped(self):
        self.authenticate(
            self.marketing_hod
        )

        file = self.make_csv(
            "Name,Phone Number\n"
            "Race Test Student,9876512151\n"
        )

        preview_response = self.preview(
            file
        )

        self.assertEqual(
            preview_response.status_code,
            201,
        )

        batch_id = (
            preview_response.json()["id"]
        )

        existing = Lead.objects.create(
            name="Created After Preview",
            phone_number="9876512151",
            vertical=Lead.Vertical.REGULAR,
            channel=Lead.Channel.DIRECT,
            source="Manual",
            created_by=self.marketing_hod,
        )

        response = self.client.post(
            (
                "/api/leads/imports/"
                f"{batch_id}/confirm/"
            ),
            {},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        data = response.json()

        self.assertEqual(
            data["imported_rows"],
            0,
        )

        self.assertEqual(
            data["duplicate_rows"],
            1,
        )

        row = LeadImportRow.objects.get(
            batch_id=batch_id
        )

        self.assertEqual(
            row.status,
            LeadImportRow.Status.DUPLICATE,
        )

        self.assertEqual(
            row.existing_lead,
            existing,
        )

        self.assertEqual(
            Lead.objects.filter(
                phone_number="9876512151"
            ).count(),
            1,
        )

    # ============================================================
    # IMPORT HISTORY
    # ============================================================

    def test_import_history_is_available(self):
        self.authenticate(
            self.marketing_hod
        )

        file = self.make_csv(
            "Name,Phone Number\n"
            "History Student,9876512201\n"
        )

        preview_response = self.preview(
            file
        )

        self.assertEqual(
            preview_response.status_code,
            201,
        )

        response = self.client.get(
            "/api/leads/imports/"
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        ids = {
            item["id"]
            for item in response.json()
        }

        self.assertIn(
            preview_response.json()["id"],
            ids,
        )

    def test_import_batch_detail_contains_rows(self):
        self.authenticate(
            self.marketing_hod
        )

        file = self.make_csv(
            "Name,Phone Number\n"
            "Detail One,9876512301\n"
            "Detail Two,9876512302\n"
        )

        preview_response = self.preview(
            file
        )

        self.assertEqual(
            preview_response.status_code,
            201,
        )

        batch_id = (
            preview_response.json()["id"]
        )

        response = self.client.get(
            (
                "/api/leads/imports/"
                f"{batch_id}/"
            )
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        self.assertEqual(
            len(response.json()["rows"]),
            2,
        )

    def test_marketing_user_sees_own_import_history(self):
        self.authenticate(
            self.marketing_hod
        )

        file = self.make_csv(
            "Name,Phone Number\n"
            "Own History,9876512401\n"
        )

        preview_response = self.preview(
            file
        )

        self.assertEqual(
            preview_response.status_code,
            201,
        )

        batch_id = (
            preview_response.json()["id"]
        )

        response = self.client.get(
            "/api/leads/imports/"
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        self.assertTrue(
            any(
                item["id"] == batch_id
                for item in response.json()
            )
        )