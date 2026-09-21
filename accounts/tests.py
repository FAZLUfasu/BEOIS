from django.urls import reverse

from rest_framework import status
from rest_framework.test import APITestCase

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