from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.test import TestCase
from rest_framework.test import APIRequestFactory

from accounts.models import Role, UserRole
from admissions.permissions import (
    CanManageAcademicMasterData,
    CanViewAcademicMasterData,
)

User = get_user_model()


class AcademicMasterPermissionTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.user = User.objects.create_user(
            username="academic_master_permission_test",
            password="TestPassword123!",
        )

    def assign_role(self, code, permissions=()):
        role = Role.objects.create(
            name=f"Academic Master Test {code}",
            code=code,
        )

        if permissions:
            codenames = [
                permission.split(".", 1)[1]
                for permission in permissions
            ]
            permission_objects = Permission.objects.filter(
                content_type__app_label="admissions",
                codename__in=codenames,
            )
            self.assertEqual(
                set(permission_objects.values_list("codename", flat=True)),
                set(codenames),
                "Expected Django permissions are missing.",
            )
            role.permissions.set(permission_objects)

        UserRole.objects.create(
            user=self.user,
            role=role,
            scope_type=UserRole.ScopeType.ORGANIZATION,
        )
        return role

    def check_permission(self, permission_class, method="post"):
        request = getattr(self.factory, method)(
            "/api/admissions/institutions/"
        )
        request.user = self.user
        return permission_class().has_permission(request, object())

    def test_role_with_all_required_permissions_can_manage(self):
        required = CanManageAcademicMasterData.required_permissions
        self.assign_role("ACADEMIC_MASTER_FULL", required)

        self.assertTrue(
            self.check_permission(CanManageAcademicMasterData)
        )

    def test_role_missing_one_required_permission_is_denied(self):
        required = CanManageAcademicMasterData.required_permissions
        self.assign_role("ACADEMIC_MASTER_PARTIAL", required[:-1])

        self.assertFalse(
            self.check_permission(CanManageAcademicMasterData)
        )

    def test_legacy_admission_role_cannot_manage_without_permissions(self):
        self.assign_role("ADMISSION")

        self.assertFalse(
            self.check_permission(CanManageAcademicMasterData)
        )

    def test_view_permission_does_not_grant_manage_permission(self):
        self.assign_role(
            "ACADEMIC_MASTER_READ_ONLY",
            ("admissions.view_institution",),
        )

        self.assertTrue(
            self.check_permission(
                CanViewAcademicMasterData,
                method="get",
            )
        )
        self.assertFalse(
            self.check_permission(CanManageAcademicMasterData)
        )

# Endpoint-level RBAC regression tests.
import json

from rest_framework.test import APITestCase

from admissions.models import (
    Institution,
    Program,
    ProgramFeePlan,
    ProgramInternalFinance,
)


class AcademicMasterEndpointRBACTests(APITestCase):
    def setUp(self):
        self.institution = Institution.objects.create(
            name="RBAC Endpoint Test Institution",
            code="RBAC-ENDPOINT-001",
        )
        self.program = Program.objects.create(
            institution=self.institution,
            name="RBAC Endpoint Test Program",
            code="RBAC-PROGRAM-001",
        )
        self.fee_plan = ProgramFeePlan.objects.create(
            program=self.program,
            name="RBAC Endpoint Test Fee Plan",
            student_total_fee="1200.00",
        )

        self.view_user = User.objects.create_user(
            username="academic_master_view_api_test",
            email="academic-view@example.com",
            password="TestPassword123!",
        )
        self.legacy_user = User.objects.create_user(
            username="academic_master_legacy_api_test",
            email="academic-legacy@example.com",
            password="TestPassword123!",
        )
        self.manager_user = User.objects.create_user(
            username="academic_master_manager_api_test",
            email="academic-manager@example.com",
            password="TestPassword123!",
        )

        view_role = Role.objects.create(
            name="Academic Master API View Only",
            code="ACADEMIC_MASTER_VIEW_API",
        )
        view_permission = Permission.objects.get(
            content_type__app_label="admissions",
            codename="view_institution",
        )
        view_role.permissions.set([view_permission])
        UserRole.objects.create(
            user=self.view_user,
            role=view_role,
            scope_type=UserRole.ScopeType.ORGANIZATION,
        )

        legacy_role = Role.objects.create(
            name="Academic Master API Legacy Admission",
            code="ADMISSION",
        )
        UserRole.objects.create(
            user=self.legacy_user,
            role=legacy_role,
            scope_type=UserRole.ScopeType.ORGANIZATION,
        )

        required = CanManageAcademicMasterData.required_permissions
        codenames = [permission.split(".", 1)[1] for permission in required]
        permission_objects = Permission.objects.filter(
            content_type__app_label="admissions",
            codename__in=codenames,
        )
        self.assertEqual(
            set(permission_objects.values_list("codename", flat=True)),
            set(codenames),
            "Required academic master-data permissions are missing.",
        )

        manager_role = Role.objects.create(
            name="Academic Master API Full Manager",
            code="ACADEMIC_MASTER_MANAGER_API",
        )
        manager_role.permissions.set(permission_objects)
        UserRole.objects.create(
            user=self.manager_user,
            role=manager_role,
            scope_type=UserRole.ScopeType.ORGANIZATION,
        )

        self.institutions_url = "/api/admissions/institutions/"
        self.programs_url = "/api/admissions/programs/"
        self.fee_plans_url = "/api/admissions/fee-plans/"
        self.preview_url = "/api/admissions/import/preview/"
        self.confirm_url = "/api/admissions/import/confirm/"

    def authenticate_as(self, user):
        self.client.force_authenticate(user=user)

    def test_anonymous_users_cannot_read_or_write_master_data(self):
        for url in (
            self.institutions_url,
            self.programs_url,
            self.fee_plans_url,
        ):
            with self.subTest(method="GET", url=url):
                self.assertEqual(self.client.get(url).status_code, 401)

        response = self.client.post(
            self.institutions_url,
            {"name": "Anonymous Write", "code": "ANON-WRITE"},
            format="json",
        )
        self.assertEqual(response.status_code, 401)

        response = self.client.post(
            self.preview_url,
            {},
            format="multipart",
        )
        self.assertEqual(response.status_code, 401)

        response = self.client.post(
            self.confirm_url,
            {"import_token": "invalid-test-token"},
            format="json",
        )
        self.assertEqual(response.status_code, 401)

    def test_view_only_role_can_read_but_cannot_mutate_or_verify(self):
        self.authenticate_as(self.view_user)

        for url in (
            self.institutions_url,
            self.programs_url,
            self.fee_plans_url,
        ):
            with self.subTest(method="GET", url=url):
                self.assertEqual(self.client.get(url).status_code, 200)

        response = self.client.post(
            self.institutions_url,
            {"name": "View Only Must Not Create", "code": "VIEW-ONLY-001"},
            format="json",
        )
        self.assertEqual(response.status_code, 403)

        response = self.client.patch(
            f"{self.institutions_url}{self.institution.pk}/",
            {"name": "Unauthorized Institution Rename"},
            format="json",
        )
        self.assertEqual(response.status_code, 403)

        response = self.client.patch(
            f"{self.programs_url}{self.program.pk}/",
            {"name": "Unauthorized Program Rename"},
            format="json",
        )
        self.assertEqual(response.status_code, 403)

        response = self.client.post(
            f"{self.programs_url}{self.program.pk}/verification/",
            {"data_status": "VERIFIED"},
            format="json",
        )
        self.assertEqual(response.status_code, 403)

        response = self.client.post(
            f"{self.fee_plans_url}{self.fee_plan.pk}/verification/",
            {"data_status": "VERIFIED"},
            format="json",
        )
        self.assertEqual(response.status_code, 403)

        response = self.client.post(self.preview_url, {}, format="multipart")
        self.assertEqual(response.status_code, 403)

        response = self.client.post(
            self.confirm_url,
            {"import_token": "invalid-test-token"},
            format="json",
        )
        self.assertEqual(response.status_code, 403)

        self.institution.refresh_from_db()
        self.program.refresh_from_db()
        self.assertEqual(
            self.institution.name,
            "RBAC Endpoint Test Institution",
        )
        self.assertEqual(
            self.program.name,
            "RBAC Endpoint Test Program",
        )

    def test_legacy_admission_role_without_permissions_cannot_write(self):
        self.authenticate_as(self.legacy_user)

        read_response = self.client.get(self.institutions_url)
        self.assertEqual(read_response.status_code, 200)

        write_response = self.client.post(
            self.institutions_url,
            {"name": "Legacy Role Must Not Create", "code": "LEGACY-WRITE"},
            format="json",
        )
        self.assertEqual(write_response.status_code, 403)

        preview_response = self.client.post(
            self.preview_url,
            {},
            format="multipart",
        )
        self.assertEqual(preview_response.status_code, 403)

    def test_full_manager_role_can_create_update_and_verify(self):
        self.authenticate_as(self.manager_user)

        create_response = self.client.post(
            self.institutions_url,
            {
                "name": "Authorized RBAC Created Institution",
                "code": "RBAC-AUTHORIZED-001",
            },
            format="json",
        )
        self.assertEqual(
            create_response.status_code,
            201,
            create_response.content.decode(),
        )

        update_response = self.client.patch(
            f"{self.institutions_url}{self.institution.pk}/",
            {"name": "Authorized RBAC Updated Institution"},
            format="json",
        )
        self.assertEqual(
            update_response.status_code,
            200,
            update_response.content.decode(),
        )

        program_verify_response = self.client.post(
            f"{self.programs_url}{self.program.pk}/verification/",
            {
                "data_status": "VERIFIED",
                "verification_notes": "Verified by API RBAC regression test",
            },
            format="json",
        )
        self.assertEqual(
            program_verify_response.status_code,
            200,
            program_verify_response.content.decode(),
        )
        self.assertEqual(
            program_verify_response.json()["data_status"],
            "VERIFIED",
        )

        fee_plan_verify_response = self.client.post(
            f"{self.fee_plans_url}{self.fee_plan.pk}/verification/",
            {
                "data_status": "VERIFIED",
                "verification_notes": "Verified by API RBAC regression test",
            },
            format="json",
        )
        self.assertEqual(
            fee_plan_verify_response.status_code,
            200,
            fee_plan_verify_response.content.decode(),
        )
        self.assertEqual(
            fee_plan_verify_response.json()["data_status"],
            "VERIFIED",
        )

    def test_program_api_does_not_disclose_internal_finance_fields(self):
        ProgramInternalFinance.objects.create(
            program=self.program,
            center_fee="9876.54",
            notes="INTERNAL_FINANCE_SECRET_RBAC_REGRESSION",
        )

        self.authenticate_as(self.view_user)
        response = self.client.get(self.programs_url)

        self.assertEqual(response.status_code, 200)
        payload = json.dumps(response.json())

        self.assertNotIn("center_fee", payload)
        self.assertNotIn("internal_finance", payload)
        self.assertNotIn(
            "INTERNAL_FINANCE_SECRET_RBAC_REGRESSION",
            payload,
        )
