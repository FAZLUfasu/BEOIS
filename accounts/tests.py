from io import BytesIO
import os
import shutil
import tempfile

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse

from rest_framework import status
from rest_framework.test import APITestCase

from PIL import Image

from hr.models import Employee
from organization.models import (
    Branch,
    BusinessUnit,
    Department,
    Trust,
)

from .models import (
    Role,
    User,
    UserRole,
)


class UserDirectoryAPITests(APITestCase):

    def setUp(self):
        self.trust = Trust.objects.create(
            name="Accounts Test Trust",
            short_name="ATT",
        )

        self.business_unit = (
            BusinessUnit.objects.create(
                trust=self.trust,
                name="Accounts Test Unit",
                code="ATU",
            )
        )

        self.branch = Branch.objects.create(
            business_unit=self.business_unit,
            name="Accounts Test Branch",
            code="ATB",
        )

        self.department = (
            Department.objects.create(
                branch=self.branch,
                name="Human Resources",
                code="HR",
            )
        )

        self.hr_role = Role.objects.create(
            name="HR",
            code="HR",
        )

        self.telecaller_role = (
            Role.objects.create(
                name="Telecaller",
                code="TELECALLER",
            )
        )

        self.hr_user = User.objects.create_user(
            username="hr-user",
            email="hr@example.com",
            password="TestPass123!",
            first_name="HR",
            last_name="Manager",
        )

        UserRole.objects.create(
            user=self.hr_user,
            role=self.hr_role,
            scope_type=(
                UserRole.ScopeType.ORGANIZATION
            ),
        )

        self.regular_user = (
            User.objects.create_user(
                username="telecaller-user",
                email="telecaller@example.com",
                password="TestPass123!",
                first_name="Tele",
                last_name="Caller",
            )
        )

        UserRole.objects.create(
            user=self.regular_user,
            role=self.telecaller_role,
            scope_type=(
                UserRole.ScopeType.OWN
            ),
        )

        self.unlinked_user = (
            User.objects.create_user(
                username="available-user",
                email="available@example.com",
                password="TestPass123!",
                first_name="Available",
                last_name="Employee",
                phone_number="9000000001",
            )
        )

        self.linked_user = (
            User.objects.create_user(
                username="linked-user",
                email="linked@example.com",
                password="TestPass123!",
                first_name="Linked",
                last_name="Employee",
                phone_number="9000000002",
            )
        )

        self.employee = Employee.objects.create(
            user=self.linked_user,
            branch=self.branch,
            department=self.department,
            designation="Executive",
            employment_type="FULL_TIME",
            employment_status="ACTIVE",
        )

    def test_anonymous_user_cannot_access_directory(
        self,
    ):
        response = self.client.get(
            reverse(
                "user-directory-list"
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_non_hr_user_cannot_access_directory(
        self,
    ):
        self.client.force_authenticate(
            user=self.regular_user
        )

        response = self.client.get(
            reverse(
                "user-directory-list"
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_hr_user_can_access_directory(
        self,
    ):
        self.client.force_authenticate(
            user=self.hr_user
        )

        response = self.client.get(
            reverse(
                "user-directory-list"
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        usernames = {
            item["username"]
            for item in response.data
        }

        self.assertIn(
            "available-user",
            usernames,
        )

        self.assertIn(
            "linked-user",
            usernames,
        )

    def test_superuser_can_access_directory(
        self,
    ):
        superuser = User.objects.create_superuser(
            username="admin",
            email="admin@example.com",
            password="TestPass123!",
        )

        self.client.force_authenticate(
            user=superuser
        )

        response = self.client.get(
            reverse(
                "user-directory-list"
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

    def test_unlinked_filter_returns_only_users_without_employee(
        self,
    ):
        self.client.force_authenticate(
            user=self.hr_user
        )

        response = self.client.get(
            reverse(
                "user-directory-list"
            ),
            {
                "unlinked": "true",
            },
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        user_ids = {
            item["id"]
            for item in response.data
        }

        self.assertIn(
            str(self.unlinked_user.id),
            user_ids,
        )

        self.assertNotIn(
            str(self.linked_user.id),
            user_ids,
        )

    def test_linked_user_contains_employee_information(
        self,
    ):
        self.client.force_authenticate(
            user=self.hr_user
        )

        response = self.client.get(
            reverse(
                "user-directory-detail",
                kwargs={
                    "pk": self.linked_user.id,
                },
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertTrue(
            response.data[
                "has_employee_profile"
            ]
        )

        self.assertEqual(
            response.data["employee_id"],
            self.employee.employee_id,
        )

    def test_search_directory(
        self,
    ):
        self.client.force_authenticate(
            user=self.hr_user
        )

        response = self.client.get(
            reverse(
                "user-directory-list"
            ),
            {
                "search": "Available",
            },
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            len(response.data),
            1,
        )

        self.assertEqual(
            response.data[0]["id"],
            str(self.unlinked_user.id),
        )

    def test_active_filter(
        self,
    ):
        self.unlinked_user.is_active = False
        self.unlinked_user.save(
            update_fields=[
                "is_active",
            ]
        )

        self.client.force_authenticate(
            user=self.hr_user
        )

        response = self.client.get(
            reverse(
                "user-directory-list"
            ),
            {
                "active": "false",
            },
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        user_ids = {
            item["id"]
            for item in response.data
        }

        self.assertIn(
            str(self.unlinked_user.id),
            user_ids,
        )

    def test_directory_does_not_expose_sensitive_fields(
        self,
    ):
        self.client.force_authenticate(
            user=self.hr_user
        )

        response = self.client.get(
            reverse(
                "user-directory-detail",
                kwargs={
                    "pk": self.unlinked_user.id,
                },
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertNotIn(
            "password",
            response.data,
        )

        self.assertNotIn(
            "permissions",
            response.data,
        )

        self.assertNotIn(
            "is_superuser",
            response.data,
        )
class SuperAdminUserManagementAPITests(
    APITestCase
):
    def setUp(self):
        self.trust = Trust.objects.create(
            name="Admin Test Trust",
            short_name="ADT",
        )

        self.business_unit = (
            BusinessUnit.objects.create(
                trust=self.trust,
                name="Admin Test Unit",
                code="ADMIN-UNIT",
            )
        )

        self.branch = Branch.objects.create(
            business_unit=self.business_unit,
            name="Admin Test Branch",
            code="ADMIN-BRANCH",
        )

        self.department = (
            Department.objects.create(
                branch=self.branch,
                name="Admin Test Department",
                code="ADMIN-DEPT",
            )
        )

        self.role = Role.objects.create(
            name="Admin Test Telecaller",
            code="ADMIN_TEST_TELECALLER",
        )

        self.superuser = (
            User.objects.create_superuser(
                username="system-admin",
                email="system-admin@example.com",
                password="AdminPass123!",
                first_name="System",
                last_name="Admin",
            )
        )

        self.regular_user = (
            User.objects.create_user(
                username="regular-account",
                email="regular-account@example.com",
                password="RegularPass123!",
                first_name="Regular",
                last_name="User",
                phone_number="9000000100",
            )
        )

        self.hr_role = Role.objects.create(
            name="Admin Test HR",
            code="ADMIN_TEST_HR",
        )

        self.hr_user = User.objects.create_user(
            username="admin-test-hr",
            email="admin-test-hr@example.com",
            password="HrPass123!",
        )

        UserRole.objects.create(
            user=self.hr_user,
            role=self.hr_role,
            scope_type=(
                UserRole.ScopeType.ORGANIZATION
            ),
        )

    def authenticate_superuser(self):
        self.client.force_authenticate(
            user=self.superuser
        )

    def test_anonymous_user_cannot_access_admin_users(
        self,
    ):
        response = self.client.get(
            reverse(
                "super-admin-user-list"
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_regular_user_cannot_access_admin_users(
        self,
    ):
        self.client.force_authenticate(
            user=self.regular_user
        )

        response = self.client.get(
            reverse(
                "super-admin-user-list"
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_hr_user_cannot_access_admin_users(
        self,
    ):
        self.client.force_authenticate(
            user=self.hr_user
        )

        response = self.client.get(
            reverse(
                "super-admin-user-list"
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_superuser_can_list_users(
        self,
    ):
        self.authenticate_superuser()

        response = self.client.get(
            reverse(
                "super-admin-user-list"
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        usernames = {
            item["username"]
            for item in response.data
        }

        self.assertIn(
            self.regular_user.username,
            usernames,
        )

        self.assertIn(
            self.superuser.username,
            usernames,
        )

    def test_admin_user_response_does_not_expose_password(
        self,
    ):
        self.authenticate_superuser()

        response = self.client.get(
            reverse(
                "super-admin-user-detail",
                kwargs={
                    "pk": self.regular_user.pk,
                },
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertNotIn(
            "password",
            response.data,
        )

    def test_superuser_can_create_user_securely(
        self,
    ):
        self.authenticate_superuser()

        response = self.client.post(
            reverse(
                "super-admin-user-list"
            ),
            {
                "username": "new-account",
                "email": "NEW@EXAMPLE.COM",
                "first_name": "New",
                "last_name": "Account",
                "phone_number": "9000000200",
                "is_active": True,
                "password": "NewPass123!",
                "confirm_password": (
                    "NewPass123!"
                ),
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        created_user = User.objects.get(
            username="new-account"
        )

        self.assertEqual(
            created_user.email,
            "new@example.com",
        )

        self.assertTrue(
            created_user.check_password(
                "NewPass123!"
            )
        )

        self.assertNotEqual(
            created_user.password,
            "NewPass123!",
        )

    def test_create_user_rejects_password_mismatch(
        self,
    ):
        self.authenticate_superuser()

        response = self.client.post(
            reverse(
                "super-admin-user-list"
            ),
            {
                "username": "bad-password",
                "email": "bad-password@example.com",
                "password": "StrongPass123!",
                "confirm_password": (
                    "DifferentPass123!"
                ),
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.assertFalse(
            User.objects.filter(
                username="bad-password"
            ).exists()
        )

    def test_superuser_can_edit_username_and_profile(
        self,
    ):
        self.authenticate_superuser()

        response = self.client.patch(
            reverse(
                "super-admin-user-detail",
                kwargs={
                    "pk": self.regular_user.pk,
                },
            ),
            {
                "username": "changed-account",
                "first_name": "Changed",
                "last_name": "Person",
                "email": "CHANGED@EXAMPLE.COM",
                "phone_number": "9000000999",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.regular_user.refresh_from_db()

        self.assertEqual(
            self.regular_user.username,
            "changed-account",
        )

        self.assertEqual(
            self.regular_user.first_name,
            "Changed",
        )

        self.assertEqual(
            self.regular_user.email,
            "changed@example.com",
        )

        self.assertEqual(
            self.regular_user.phone_number,
            "9000000999",
        )

    def test_admin_cannot_deactivate_own_account(
        self,
    ):
        self.authenticate_superuser()

        response = self.client.patch(
            reverse(
                "super-admin-user-detail",
                kwargs={
                    "pk": self.superuser.pk,
                },
            ),
            {
                "is_active": False,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.superuser.refresh_from_db()

        self.assertTrue(
            self.superuser.is_active
        )

    def test_duplicate_email_is_rejected(
        self,
    ):
        duplicate_user = (
            User.objects.create_user(
                username="duplicate-target",
                email="duplicate@example.com",
                password="DuplicatePass123!",
            )
        )

        self.authenticate_superuser()

        response = self.client.patch(
            reverse(
                "super-admin-user-detail",
                kwargs={
                    "pk": duplicate_user.pk,
                },
            ),
            {
                "email": (
                    self.regular_user.email.upper()
                ),
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_duplicate_username_is_rejected(
        self,
    ):
        other_user = User.objects.create_user(
            username="another-account",
            email="another-account@example.com",
            password="AnotherPass123!",
        )

        self.authenticate_superuser()

        response = self.client.patch(
            reverse(
                "super-admin-user-detail",
                kwargs={
                    "pk": other_user.pk,
                },
            ),
            {
                "username": (
                    self.regular_user
                    .username
                    .upper()
                ),
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_superuser_can_reset_password_securely(
        self,
    ):
        old_password = "RegularPass123!"
        new_password = "ChangedPass456!"

        self.assertTrue(
            self.regular_user.check_password(
                old_password
            )
        )

        self.authenticate_superuser()

        response = self.client.post(
            reverse(
                "super-admin-user-password",
                kwargs={
                    "pk": self.regular_user.pk,
                },
            ),
            {
                "new_password": new_password,
                "confirm_password": new_password,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.regular_user.refresh_from_db()

        self.assertFalse(
            self.regular_user.check_password(
                old_password
            )
        )

        self.assertTrue(
            self.regular_user.check_password(
                new_password
            )
        )

        self.assertNotEqual(
            self.regular_user.password,
            new_password,
        )

    def test_password_reset_rejects_mismatch(
        self,
    ):
        self.authenticate_superuser()

        response = self.client.post(
            reverse(
                "super-admin-user-password",
                kwargs={
                    "pk": self.regular_user.pk,
                },
            ),
            {
                "new_password": "ChangedPass456!",
                "confirm_password": (
                    "WrongPass456!"
                ),
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_superuser_can_list_available_roles(
        self,
    ):
        self.authenticate_superuser()

        response = self.client.get(
            reverse(
                "super-admin-role-list"
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        role_ids = {
            item["id"]
            for item in response.data
        }

        self.assertIn(
            str(self.role.id),
            role_ids,
        )

    def test_superuser_can_assign_role_with_scope(
        self,
    ):
        self.authenticate_superuser()

        response = self.client.post(
            reverse(
                "super-admin-user-role-list",
                kwargs={
                    "pk": self.regular_user.pk,
                },
            ),
            {
                "role": str(self.role.id),
                "scope_type": (
                    UserRole.ScopeType.DEPARTMENT
                ),
                "business_unit": str(
                    self.business_unit.id
                ),
                "branch": str(
                    self.branch.id
                ),
                "department": str(
                    self.department.id
                ),
                "is_active": True,
                "notes": "Assigned by test.",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        assignment = UserRole.objects.get(
            user=self.regular_user,
            role=self.role,
        )

        self.assertEqual(
            assignment.scope_type,
            UserRole.ScopeType.DEPARTMENT,
        )

        self.assertEqual(
            assignment.business_unit,
            self.business_unit,
        )

        self.assertEqual(
            assignment.branch,
            self.branch,
        )

        self.assertEqual(
            assignment.department,
            self.department,
        )

    def test_invalid_role_scope_is_rejected(
        self,
    ):
        self.authenticate_superuser()

        response = self.client.post(
            reverse(
                "super-admin-user-role-list",
                kwargs={
                    "pk": self.regular_user.pk,
                },
            ),
            {
                "role": str(self.role.id),
                "scope_type": (
                    UserRole.ScopeType.DEPARTMENT
                ),
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.assertFalse(
            UserRole.objects.filter(
                user=self.regular_user,
                role=self.role,
            ).exists()
        )

    def test_superuser_can_update_role_scope(
        self,
    ):
        assignment = UserRole.objects.create(
            user=self.regular_user,
            role=self.role,
            scope_type=(
                UserRole.ScopeType.OWN
            ),
        )

        self.authenticate_superuser()

        response = self.client.patch(
            reverse(
                "super-admin-user-role-detail",
                kwargs={
                    "user_pk": (
                        self.regular_user.pk
                    ),
                    "role_pk": assignment.pk,
                },
            ),
            {
                "scope_type": (
                    UserRole.ScopeType.BRANCH
                ),
                "business_unit": str(
                    self.business_unit.pk
                ),
                "branch": str(
                    self.branch.pk
                ),
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        assignment.refresh_from_db()

        self.assertEqual(
            assignment.scope_type,
            UserRole.ScopeType.BRANCH,
        )

        self.assertEqual(
            assignment.branch,
            self.branch,
        )

    def test_superuser_can_remove_role_assignment(
        self,
    ):
        assignment = UserRole.objects.create(
            user=self.regular_user,
            role=self.role,
            scope_type=(
                UserRole.ScopeType.OWN
            ),
        )

        self.authenticate_superuser()

        response = self.client.delete(
            reverse(
                "super-admin-user-role-detail",
                kwargs={
                    "user_pk": (
                        self.regular_user.pk
                    ),
                    "role_pk": assignment.pk,
                },
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_204_NO_CONTENT,
        )

        self.assertFalse(
            UserRole.objects.filter(
                pk=assignment.pk
            ).exists()
        )

    def test_regular_user_cannot_reset_password_for_other_user(
        self,
    ):
        self.client.force_authenticate(
            user=self.regular_user
        )

        response = self.client.post(
            reverse(
                "super-admin-user-password",
                kwargs={
                    "pk": self.hr_user.pk,
                },
            ),
            {
                "new_password": "ChangedPass456!",
                "confirm_password": (
                    "ChangedPass456!"
                ),
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_me_endpoint_cannot_change_privileged_fields(
        self,
    ):
        self.client.force_authenticate(
            user=self.regular_user
        )

        original_username = (
            self.regular_user.username
        )

        response = self.client.patch(
            reverse("current-user"),
            {
                "username": "self-promoted",
                "is_superuser": True,
                "roles": [],
                "permissions": [
                    "auth.add_user"
                ],
                "first_name": "Allowed",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.regular_user.refresh_from_db()

        self.assertEqual(
            self.regular_user.username,
            original_username,
        )

        self.assertFalse(
            self.regular_user.is_superuser
        )

        self.assertEqual(
            self.regular_user.first_name,
            "Allowed",
        )

class ProfilePictureAPITests(APITestCase):
    """Profile-picture storage and permission regression tests."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls._temp_media_root = tempfile.mkdtemp(
            prefix="beois-profile-picture-tests-"
        )
        cls._media_override = override_settings(
            MEDIA_ROOT=cls._temp_media_root
        )
        cls._media_override.enable()

    @classmethod
    def tearDownClass(cls):
        cls._media_override.disable()
        shutil.rmtree(cls._temp_media_root, ignore_errors=True)
        super().tearDownClass()

    def setUp(self):
        self.superuser = User.objects.create_superuser(
            username="picture-admin",
            email="picture-admin@example.com",
            password="AdminPass123!",
            first_name="Picture",
            last_name="Admin",
        )
        self.regular_user = User.objects.create_user(
            username="picture-user",
            email="picture-user@example.com",
            password="UserPass123!",
            first_name="Picture",
            last_name="User",
        )
        self.other_user = User.objects.create_user(
            username="picture-other",
            email="picture-other@example.com",
            password="OtherPass123!",
            first_name="Other",
            last_name="User",
        )

    def make_image(
        self,
        filename="profile.png",
        image_format="PNG",
        size=(64, 64),
    ):
        buffer = BytesIO()
        Image.new("RGB", size, (40, 90, 160)).save(
            buffer,
            format=image_format,
        )
        buffer.seek(0)

        content_type = {
            "PNG": "image/png",
            "JPEG": "image/jpeg",
            "WEBP": "image/webp",
        }.get(image_format.upper(), "application/octet-stream")

        return SimpleUploadedFile(
            filename,
            buffer.read(),
            content_type=content_type,
        )

    def self_picture_url(self):
        return reverse("current-user-profile-picture")

    def admin_picture_url(self, user):
        return reverse(
            "super-admin-user-profile-picture",
            kwargs={"pk": user.pk},
        )

    def test_anonymous_user_cannot_upload_profile_picture(self):
        response = self.client.post(
            self.self_picture_url(),
            {"profile_picture": self.make_image()},
            format="multipart",
        )
        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_authenticated_user_can_upload_own_profile_picture(self):
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.post(
            self.self_picture_url(),
            {"profile_picture": self.make_image("self-upload.png")},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.regular_user.refresh_from_db()
        self.assertTrue(bool(self.regular_user.profile_picture))
        self.assertTrue(
            os.path.exists(self.regular_user.profile_picture.path)
        )
        self.assertIn("profile_picture", response.data)

    def test_authenticated_user_can_replace_own_profile_picture_and_old_file_is_removed(
        self,
    ):
        self.client.force_authenticate(user=self.regular_user)

        first_response = self.client.post(
            self.self_picture_url(),
            {"profile_picture": self.make_image("first-picture.png")},
            format="multipart",
        )
        self.assertEqual(
            first_response.status_code,
            status.HTTP_200_OK,
        )

        self.regular_user.refresh_from_db()
        old_path = self.regular_user.profile_picture.path
        self.assertTrue(os.path.exists(old_path))

        second_response = self.client.post(
            self.self_picture_url(),
            {
                "profile_picture": self.make_image(
                    "replacement-picture.jpg",
                    image_format="JPEG",
                )
            },
            format="multipart",
        )
        self.assertEqual(
            second_response.status_code,
            status.HTTP_200_OK,
        )

        self.regular_user.refresh_from_db()
        new_path = self.regular_user.profile_picture.path
        self.assertNotEqual(old_path, new_path)
        self.assertFalse(os.path.exists(old_path))
        self.assertTrue(os.path.exists(new_path))

    def test_authenticated_user_can_remove_own_profile_picture(self):
        self.client.force_authenticate(user=self.regular_user)

        upload_response = self.client.post(
            self.self_picture_url(),
            {"profile_picture": self.make_image("remove-me.png")},
            format="multipart",
        )
        self.assertEqual(
            upload_response.status_code,
            status.HTTP_200_OK,
        )

        self.regular_user.refresh_from_db()
        stored_path = self.regular_user.profile_picture.path

        response = self.client.delete(self.self_picture_url())
        self.assertEqual(
            response.status_code,
            status.HTTP_204_NO_CONTENT,
        )

        self.regular_user.refresh_from_db()
        self.assertFalse(bool(self.regular_user.profile_picture))
        self.assertFalse(os.path.exists(stored_path))

    def test_invalid_non_image_file_is_rejected(self):
        self.client.force_authenticate(user=self.regular_user)

        invalid_file = SimpleUploadedFile(
            "not-an-image.png",
            b"This is not a valid image file.",
            content_type="image/png",
        )
        response = self.client.post(
            self.self_picture_url(),
            {"profile_picture": invalid_file},
            format="multipart",
        )
        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.regular_user.refresh_from_db()
        self.assertFalse(bool(self.regular_user.profile_picture))

    def test_oversized_profile_picture_is_rejected(self):
        self.client.force_authenticate(user=self.regular_user)

        oversized_file = SimpleUploadedFile(
            "too-large.png",
            b"x" * (5 * 1024 * 1024 + 1),
            content_type="image/png",
        )
        response = self.client.post(
            self.self_picture_url(),
            {"profile_picture": oversized_file},
            format="multipart",
        )
        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.regular_user.refresh_from_db()
        self.assertFalse(bool(self.regular_user.profile_picture))

    def test_regular_user_cannot_upload_profile_picture_for_other_user(
        self,
    ):
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.post(
            self.admin_picture_url(self.other_user),
            {"profile_picture": self.make_image("forbidden.png")},
            format="multipart",
        )
        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.other_user.refresh_from_db()
        self.assertFalse(bool(self.other_user.profile_picture))

    def test_regular_user_cannot_remove_profile_picture_for_other_user(
        self,
    ):
        self.client.force_authenticate(user=self.superuser)
        upload_response = self.client.post(
            self.admin_picture_url(self.other_user),
            {"profile_picture": self.make_image("protected.png")},
            format="multipart",
        )
        self.assertEqual(
            upload_response.status_code,
            status.HTTP_200_OK,
        )

        self.other_user.refresh_from_db()
        stored_path = self.other_user.profile_picture.path

        self.client.force_authenticate(user=self.regular_user)
        response = self.client.delete(
            self.admin_picture_url(self.other_user)
        )
        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.other_user.refresh_from_db()
        self.assertTrue(bool(self.other_user.profile_picture))
        self.assertTrue(os.path.exists(stored_path))

    def test_superuser_can_upload_profile_picture_for_other_user(self):
        self.client.force_authenticate(user=self.superuser)
        response = self.client.post(
            self.admin_picture_url(self.other_user),
            {"profile_picture": self.make_image("admin-upload.png")},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.other_user.refresh_from_db()
        self.assertTrue(bool(self.other_user.profile_picture))
        self.assertTrue(
            os.path.exists(self.other_user.profile_picture.path)
        )

    def test_superuser_can_replace_other_users_profile_picture_and_old_file_is_removed(
        self,
    ):
        self.client.force_authenticate(user=self.superuser)

        first_response = self.client.post(
            self.admin_picture_url(self.other_user),
            {"profile_picture": self.make_image("admin-first.png")},
            format="multipart",
        )
        self.assertEqual(
            first_response.status_code,
            status.HTTP_200_OK,
        )

        self.other_user.refresh_from_db()
        old_path = self.other_user.profile_picture.path

        second_response = self.client.post(
            self.admin_picture_url(self.other_user),
            {
                "profile_picture": self.make_image(
                    "admin-replacement.jpg",
                    image_format="JPEG",
                )
            },
            format="multipart",
        )
        self.assertEqual(
            second_response.status_code,
            status.HTTP_200_OK,
        )

        self.other_user.refresh_from_db()
        new_path = self.other_user.profile_picture.path
        self.assertNotEqual(old_path, new_path)
        self.assertFalse(os.path.exists(old_path))
        self.assertTrue(os.path.exists(new_path))

    def test_superuser_can_remove_other_users_profile_picture(self):
        self.client.force_authenticate(user=self.superuser)

        upload_response = self.client.post(
            self.admin_picture_url(self.other_user),
            {"profile_picture": self.make_image("admin-remove.png")},
            format="multipart",
        )
        self.assertEqual(
            upload_response.status_code,
            status.HTTP_200_OK,
        )

        self.other_user.refresh_from_db()
        stored_path = self.other_user.profile_picture.path

        response = self.client.delete(
            self.admin_picture_url(self.other_user)
        )
        self.assertEqual(
            response.status_code,
            status.HTTP_204_NO_CONTENT,
        )

        self.other_user.refresh_from_db()
        self.assertFalse(bool(self.other_user.profile_picture))
        self.assertFalse(os.path.exists(stored_path))

