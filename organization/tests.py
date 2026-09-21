from django.contrib.auth import get_user_model
from django.urls import reverse

from rest_framework import status
from rest_framework.test import APITestCase

from .models import (
    Branch,
    BusinessUnit,
    Department,
    Trust,
)


User = get_user_model()


class OrganizationAPITests(APITestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username="organization-test-user",
            password="TestPass123!",
        )

        self.client.force_authenticate(
            user=self.user
        )

        self.trust = Trust.objects.create(
            name="Brainstorm Educational Service Trust",
            short_name="BEST",
        )

        self.business_unit = (
            BusinessUnit.objects.create(
                trust=self.trust,
                name="BEST College",
                code="BEST-COLLEGE",
            )
        )

        self.branch = Branch.objects.create(
            business_unit=self.business_unit,
            name="Head Office",
            code="HO",
            city="Chennai",
            state="Tamil Nadu",
            is_head_office=True,
        )

        self.department = (
            Department.objects.create(
                branch=self.branch,
                name="Admissions",
                code="ADM",
            )
        )

        self.shared_department = (
            Department.objects.create(
                branch=None,
                name="Management",
                code="MGT",
            )
        )

    def test_authentication_is_required(self):
        self.client.force_authenticate(
            user=None
        )

        response = self.client.get(
            reverse(
                "organization-branch-list"
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_list_trusts(self):
        response = self.client.get(
            reverse(
                "organization-trust-list"
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            len(response.data),
            1,
        )

    def test_list_business_units(self):
        response = self.client.get(
            reverse(
                "organization-business-unit-list"
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            response.data[0]["name"],
            "BEST College",
        )

    def test_list_branches(self):
        response = self.client.get(
            reverse(
                "organization-branch-list"
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            response.data[0]["name"],
            "Head Office",
        )

        self.assertEqual(
            response.data[0][
                "business_unit_name"
            ],
            "BEST College",
        )

    def test_filter_active_branches(self):
        Branch.objects.create(
            business_unit=self.business_unit,
            name="Inactive Branch",
            code="INACTIVE",
            is_active=False,
        )

        response = self.client.get(
            reverse(
                "organization-branch-list"
            ),
            {
                "active": "true",
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
            str(self.branch.id),
        )

    def test_filter_departments_by_branch(self):
        response = self.client.get(
            reverse(
                "organization-department-list"
            ),
            {
                "branch": str(
                    self.branch.id
                ),
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
            response.data[0]["name"],
            "Admissions",
        )

    def test_filter_shared_departments(self):
        response = self.client.get(
            reverse(
                "organization-department-list"
            ),
            {
                "shared": "true",
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
            response.data[0]["name"],
            "Management",
        )

        self.assertIsNone(
            response.data[0]["branch"]
        )