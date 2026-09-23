from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

from rest_framework import status
from rest_framework.test import APIClient

from .models import (
    SystemSettings,
    SystemSettingsAudit,
)
from .services import (
    build_next_identifier,
    extract_identifier_number,
    format_identifier,
    get_identifier_prefix,
)


User = get_user_model()


def create_user(
    username,
    *,
    role=None,
    is_superuser=False,
):
    """
    Create a test user with a unique email address.

    BEOIS requires email uniqueness, so every test user must
    receive its own email rather than sharing a blank value.
    """

    kwargs = {
        "username": username,
        "email": f"{username}@example.com",
    }

    if is_superuser:
        user = User.objects.create_superuser(
            password="TestPass123!",
            **kwargs,
        )
    else:
        user = User.objects.create_user(
            password="TestPass123!",
            **kwargs,
        )

    if role is not None and hasattr(
        user,
        "role",
    ):
        user.role = role
        user.save(
            update_fields=["role"]
        )

    return user

class SystemSettingsModelTests(TestCase):

    def test_get_settings_creates_singleton(self):
        self.assertEqual(
            SystemSettings.objects.count(),
            0,
        )

        first = SystemSettings.get_settings()
        second = SystemSettings.get_settings()

        self.assertEqual(
            first.pk,
            second.pk,
        )

        self.assertEqual(
            SystemSettings.objects.count(),
            1,
        )

    def test_default_settings(self):
        settings_object = (
            SystemSettings.get_settings()
        )

        self.assertEqual(
            settings_object.system_short_name,
            "BEOIS",
        )

        self.assertEqual(
            settings_object.timezone,
            "Asia/Kolkata",
        )

        self.assertEqual(
            settings_object.currency_code,
            "INR",
        )

        self.assertEqual(
            settings_object.student_prefix,
            "ST",
        )

        self.assertEqual(
            settings_object.employee_prefix,
            "EMP",
        )

    def test_second_settings_record_is_rejected(self):
        SystemSettings.get_settings()

        second = SystemSettings(
            system_name="Another System",
            system_short_name="OTHER",
        )

        with self.assertRaises(Exception):
            second.save()


class NumberingServiceTests(TestCase):

    def setUp(self):
        self.settings = (
            SystemSettings.get_settings()
        )

    def test_extract_identifier_number(self):
        self.assertEqual(
            extract_identifier_number(
                "ST-00025"
            ),
            25,
        )

        self.assertEqual(
            extract_identifier_number(
                "EMP-00100"
            ),
            100,
        )

        self.assertIsNone(
            extract_identifier_number(
                "INVALID"
            )
        )

    def test_format_identifier(self):
        self.assertEqual(
            format_identifier(
                "ST",
                12,
            ),
            "ST-00012",
        )

    def test_get_identifier_prefix(self):
        self.assertEqual(
            get_identifier_prefix(
                "student"
            ),
            "ST",
        )

        self.assertEqual(
            get_identifier_prefix(
                "employee"
            ),
            "EMP",
        )

    def test_invalid_identifier_type(self):
        with self.assertRaises(
            ValueError
        ):
            get_identifier_prefix(
                "unknown"
            )


class SystemSettingsAPITests(TestCase):

    def setUp(self):
        self.client = APIClient()

        self.settings_url = reverse(
            "core:system-settings"
        )

        self.audit_url = reverse(
            "core:system-settings-audit"
        )

        self.regular_user = create_user(
            "settings_regular",
        )

        self.superuser = create_user(
            "settings_admin",
            is_superuser=True,
        )

    def test_anonymous_user_cannot_read_settings(self):
        response = self.client.get(
            self.settings_url
        )

        self.assertIn(
            response.status_code,
            [
                status.HTTP_401_UNAUTHORIZED,
                status.HTTP_403_FORBIDDEN,
            ],
        )

    def test_authenticated_user_can_read_settings(self):
        self.client.force_authenticate(
            self.regular_user
        )

        response = self.client.get(
            self.settings_url
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            response.data[
                "system_short_name"
            ],
            "BEOIS",
        )

    def test_regular_user_cannot_modify_settings(self):
        self.client.force_authenticate(
            self.regular_user
        )

        response = self.client.patch(
            self.settings_url,
            {
                "system_name":
                    "Unauthorized Change"
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_superuser_can_modify_settings(self):
        self.client.force_authenticate(
            self.superuser
        )

        response = self.client.patch(
            self.settings_url,
            {
                "system_name":
                    "BEST Education ERP"
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            response.data[
                "system_name"
            ],
            "BEST Education ERP",
        )

    def test_update_creates_audit_record(self):
        self.client.force_authenticate(
            self.superuser
        )

        response = self.client.patch(
            self.settings_url,
            {
                "student_prefix":
                    "STD"
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            SystemSettingsAudit.objects.count(),
            1,
        )

        audit = (
            SystemSettingsAudit.objects.first()
        )

        self.assertIn(
            "student_prefix",
            audit.changed_fields,
        )

        self.assertEqual(
            audit.changed_fields[
                "student_prefix"
            ]["old"],
            "ST",
        )

        self.assertEqual(
            audit.changed_fields[
                "student_prefix"
            ]["new"],
            "STD",
        )

    def test_audit_endpoint(self):
        settings_object = (
            SystemSettings.get_settings()
        )

        SystemSettingsAudit.objects.create(
            settings=settings_object,
            changed_by=self.superuser,
            changed_fields={
                "system_name": {
                    "old": "Old",
                    "new": "New",
                }
            },
        )

        self.client.force_authenticate(
            self.regular_user
        )

        response = self.client.get(
            self.audit_url
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            len(response.data),
            1,
        )

    def test_put_is_not_allowed(self):
        self.client.force_authenticate(
            self.superuser
        )

        response = self.client.put(
            self.settings_url,
            {
                "system_name": "Test"
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_405_METHOD_NOT_ALLOWED,
        )