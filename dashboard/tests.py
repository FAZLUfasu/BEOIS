from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model

from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import Role, UserRole
from organization.models import (
    Trust,
    BusinessUnit,
    Branch,
    Department,
)
from hr.models import Employee


User = get_user_model()


@override_settings(
    ALLOWED_HOSTS=[
        "testserver",
        "localhost",
        "127.0.0.1",
    ]
)
class DashboardSecurityTests(TestCase):

    def setUp(self):
        self.client = APIClient()

        # ----------------------------------------------------
        # ORGANIZATION
        # ----------------------------------------------------

        self.trust = Trust.objects.create(
            name="BEOIS Test Trust",
        )

        self.business_unit = BusinessUnit.objects.create(
            trust=self.trust,
            name="BEOIS Test Business Unit",
        )

        self.branch = Branch.objects.create(
            business_unit=self.business_unit,
            name="BEOIS Test Branch",
        )

        self.marketing_department = Department.objects.create(
            name="Marketing",
            branch=None,
        )

        # ----------------------------------------------------
        # ROLES
        # ----------------------------------------------------

        self.department_head_role = Role.objects.create(
            name="Test Department Head",
            code="DEPARTMENT_HEAD",
            is_active=True,
        )

        # ----------------------------------------------------
        # MARKETING HOD
        # ----------------------------------------------------

        self.marketing_hod = User.objects.create_user(
            username="marketing_hod_test",
            email="marketing_hod_test@example.com",
            password="StrongTestPassword123!",
            is_active=True,
        )

        self.marketing_employee = Employee.objects.create(
            user=self.marketing_hod,
            branch=self.branch,
            department=self.marketing_department,
            designation="Marketing Head",
            employment_status="ACTIVE",
        )

        UserRole.objects.create(
            user=self.marketing_hod,
            role=self.department_head_role,
            scope_type=UserRole.ScopeType.DEPARTMENT,
            department=self.marketing_department,
            is_active=True,
        )

        # ----------------------------------------------------
        # SUPERUSER
        # ----------------------------------------------------

        self.superuser = User.objects.create_superuser(
            username="dashboard_superuser_test",
            email="dashboard_superuser_test@example.com",
            password="StrongTestPassword123!",
        )

    # ========================================================
    # HELPERS
    # ========================================================

    def authenticate(self, user):
        self.client.force_authenticate(
            user=user
        )

    def clear_authentication(self):
        self.client.force_authenticate(
            user=None
        )

    # ========================================================
    # ANONYMOUS ACCESS
    # ========================================================

    def test_anonymous_user_cannot_access_dashboard(self):
        response = self.client.get(
            "/api/dashboard/me/"
        )

        self.assertIn(
            response.status_code,
            [401, 403],
        )

    # ========================================================
    # MARKETING HOD ACCESS
    # ========================================================

    def test_marketing_hod_can_access_me_dashboard(self):
        self.authenticate(
            self.marketing_hod
        )

        response = self.client.get(
            "/api/dashboard/me/"
        )

        self.assertEqual(
            response.status_code,
            200,
        )

    def test_marketing_hod_can_access_marketing_dashboard(self):
        self.authenticate(
            self.marketing_hod
        )

        response = self.client.get(
            "/api/dashboard/marketing/"
        )

        self.assertEqual(
            response.status_code,
            200,
        )

    def test_marketing_hod_can_access_telecalling_dashboard(self):
        self.authenticate(
            self.marketing_hod
        )

        response = self.client.get(
            "/api/dashboard/telecalling/"
        )

        self.assertEqual(
            response.status_code,
            200,
        )

    def test_marketing_hod_cannot_access_admissions_dashboard(self):
        self.authenticate(
            self.marketing_hod
        )

        response = self.client.get(
            "/api/dashboard/admissions/"
        )

        self.assertEqual(
            response.status_code,
            403,
        )

    def test_marketing_hod_cannot_access_education_dashboard(self):
        self.authenticate(
            self.marketing_hod
        )

        response = self.client.get(
            "/api/dashboard/education/"
        )

        self.assertEqual(
            response.status_code,
            403,
        )

    def test_marketing_hod_cannot_access_partner_dashboard(self):
        self.authenticate(
            self.marketing_hod
        )

        response = self.client.get(
            "/api/dashboard/partners/"
        )

        self.assertEqual(
            response.status_code,
            403,
        )

    def test_marketing_hod_cannot_access_hr_dashboard(self):
        self.authenticate(
            self.marketing_hod
        )

        response = self.client.get(
            "/api/dashboard/hr/"
        )

        self.assertEqual(
            response.status_code,
            403,
        )

    def test_marketing_hod_cannot_access_finance_dashboard(self):
        self.authenticate(
            self.marketing_hod
        )

        response = self.client.get(
            "/api/dashboard/finance/"
        )

        self.assertEqual(
            response.status_code,
            403,
        )

    def test_marketing_hod_cannot_access_management_dashboard(self):
        self.authenticate(
            self.marketing_hod
        )

        response = self.client.get(
            "/api/dashboard/management/"
        )

        self.assertEqual(
            response.status_code,
            403,
        )

    # ========================================================
    # /ME/ PERMISSION MAP
    # ========================================================

    def test_marketing_hod_me_dashboard_returns_correct_access_map(self):
        self.authenticate(
            self.marketing_hod
        )

        response = self.client.get(
            "/api/dashboard/me/"
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        dashboards = response.data[
            "dashboards"
        ]

        self.assertFalse(
            dashboards["management"]
        )

        self.assertTrue(
            dashboards["marketing"]
        )

        self.assertTrue(
            dashboards["telecalling"]
        )

        self.assertFalse(
            dashboards["admissions"]
        )

        self.assertFalse(
            dashboards["education"]
        )

        self.assertFalse(
            dashboards["partners"]
        )

        self.assertFalse(
            dashboards["hr"]
        )

        self.assertFalse(
            dashboards["finance"]
        )

    # ========================================================
    # SUPERUSER
    # ========================================================

    def test_superuser_can_access_all_dashboards(self):
        self.authenticate(
            self.superuser
        )

        urls = [
            "/api/dashboard/me/",
            "/api/dashboard/management/",
            "/api/dashboard/marketing/",
            "/api/dashboard/telecalling/",
            "/api/dashboard/admissions/",
            "/api/dashboard/education/",
            "/api/dashboard/partners/",
            "/api/dashboard/hr/",
            "/api/dashboard/finance/",
        ]

        for url in urls:
            with self.subTest(url=url):
                response = self.client.get(
                    url
                )

                self.assertEqual(
                    response.status_code,
                    200,
                )

    # ========================================================
    # DATE VALIDATION
    # ========================================================

    def test_invalid_dashboard_date_returns_400(self):
        self.authenticate(
            self.superuser
        )

        response = self.client.get(
            "/api/dashboard/management/"
            "?start_date=invalid-date"
        )

        self.assertEqual(
            response.status_code,
            400,
        )

        self.assertIn(
            "detail",
            response.data,
        )

    def test_valid_dashboard_date_range_returns_200(self):
        self.authenticate(
            self.superuser
        )

        response = self.client.get(
            "/api/dashboard/management/"
            "?start_date=2026-09-01"
            "&end_date=2026-09-30"
        )

        self.assertEqual(
            response.status_code,
            200,
        )

    # ========================================================
    # JWT
    # ========================================================

    def test_jwt_access_token_authenticates_user(self):
        refresh = RefreshToken.for_user(
            self.marketing_hod
        )

        access_token = str(
            refresh.access_token
        )

        self.clear_authentication()

        self.client.credentials(
            HTTP_AUTHORIZATION=(
                f"Bearer {access_token}"
            )
        )

        response = self.client.get(
            "/api/dashboard/me/"
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        self.assertEqual(
            response.data["user"]["username"],
            self.marketing_hod.username,
        )

    def test_invalid_jwt_is_rejected(self):
        self.clear_authentication()

        self.client.credentials(
            HTTP_AUTHORIZATION=(
                "Bearer invalid-token"
            )
        )

        response = self.client.get(
            "/api/dashboard/me/"
        )

        self.assertEqual(
            response.status_code,
            401,
        )